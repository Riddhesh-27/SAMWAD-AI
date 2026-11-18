"""
SAMVAD AI — Grammar Refinement Engine
Provides a robust, 100% offline rule-based grammar transformation system designed specifically for Sign Language (ISL/ASL)
glosses and fingerspelled sequences, with optional online API enhancement fallback.
"""

import re
import os
from typing import Dict, Any, List, Optional


class GrammarRefiner:
    def __init__(self):
        # Known fingerspelled word dictionary for merging separated letters
        self.common_words = {
            "HELLO", "HELP", "THANK", "YOU", "WATER", "FOOD", "HUNGRY", "DOCTOR",
            "HOSPITAL", "MEDICINE", "NAME", "WHAT", "WHERE", "WHEN", "WHY", "HOW",
            "YES", "NO", "PLEASE", "GOOD", "MORNING", "NIGHT", "HOME", "SCHOOL",
            "WORK", "TIRED", "PAIN", "STOP", "GO", "COME", "WANT", "NEED", "LIKE",
            "LOVE", "FAMILY", "FRIEND", "BROTHER", "SISTER", "MOTHER", "FATHER",
            "CALL", "POLICE", "EMERGENCY", "MONEY", "TIME", "TODAY", "TOMORROW",
            "YESTERDAY", "NOW", "LATER", "HAPPY", "SAD", "BUS", "TRAIN", "CAR",
            "THUMBS", "UP", "WELL", "DONE"
        }

        # Multi-word & Conversational Sign Gloss patterns
        self.gloss_patterns = [
            # Thumbs Up & Conversational Praise
            (r"\bHELLO\s+(?:THUMBS\s+UP|WELL\s+DONE)\b", "Hello! Well done, great job.", "Greeting with praise refinement"),
            (r"\b(?:THUMBS\s+UP|WELL\s+DONE)\b", "Well done! Excellent work.", "Thumbs Up / Praise sign resolution"),
            (r"\bGOOD\s+JOB\b", "Good job! Well done.", "Praise sign resolution"),
            (r"\bI\s+LOVE\s+YOU\b", "I love you very much.", "Affection sign resolution"),
            (r"\bCALL\s+ME\b", "Please give me a call.", "Communication request"),
            (r"\bPEACE\b", "Peace and warm greetings to you.", "Peace sign resolution"),
            (r"\bOKAY\b", "Okay, understood and agreed.", "Affirmation sign resolution"),

            # Greetings & Introductions
            (r"\bHELLO\s+YOU\s+NAME\s+WHAT\b", "Hello! What is your name?", "Greeting & WH-Question formation"),
            (r"\bHELLO\s+NAME\s+WHAT\b", "Hello! What is your name?", "Greeting & WH-Question formation"),
            (r"\bHELLO\s+HOW\s+YOU\b", "Hello! How are you doing today?", "Greeting & inquiry formation"),
            (r"\bHELLO\b", "Hello! Greetings.", "Polite greeting refinement"),
            (r"\bNAMASTE\b", "Namaste! Warm greetings.", "Indian greeting refinement"),
            (r"\bYOU\s+NAME\s+WHAT\b", "What is your name?", "WH-Question rearrangement"),
            (r"\bNAME\s+WHAT\b", "What is your name?", "Question completion"),
            (r"\bYOU\s+HOW\b", "How are you doing?", "Greeting question formation"),
            (r"\bHOW\s+YOU\b", "How are you doing?", "Greeting question formation"),

            # Location & Inquiries
            (r"\bWHERE\s+BATHROOM\b", "Where is the bathroom, please?", "Location question formation"),
            (r"\bBATHROOM\s+WHERE\b", "Where is the bathroom, please?", "Location question inversion"),
            (r"\bWHERE\s+HOSPITAL\b", "Where is the nearest hospital?", "Emergency location inquiry"),
            (r"\bHOSPITAL\s+WHERE\b", "Where is the nearest hospital?", "Emergency location inversion"),
            (r"\bTRAIN\s+TIME\s+WHAT\b", "What is the train time?", "Schedule inquiry"),
            (r"\bTIME\s+WHAT\b", "What time is it now?", "Time inquiry"),
            (r"\bYOU\s+HELP\s+ME\b", "Can you please help me?", "Polite request formation"),
            (r"\bYOU\s+WANT\s+WHAT\b", "What would you like?", "WH-Question formation"),
            (r"\bHELP\s+ME\s+PLEASE\b", "Please help me.", "Polite request"),
            (r"\bPLEASE\s+HELP\b", "Please help me.", "Polite request"),
            (r"\bHELP\b", "Please help me.", "Emergency request resolution"),

            # Needs & Wants (SVO transformation)
            # --- YOU asking (checked first via re.search order) ---
            (r"\bYOU\s+WANT\s+WATER\b", "Would you like some water?", "Inquiry resolution"),
            (r"\bYOU\s+WANT\s+FOOD\b", "Would you like some food?", "Inquiry resolution"),
            # --- With explicit I / ME ---
            (r"\bI\s+WATER\s+WANT\b", "I would like some water, please.", "Object-Verb to SVO ordering"),
            (r"\bME\s+WATER\s+WANT\b", "I would like some water, please.", "Pronoun correction & SVO ordering"),
            (r"\bI\s+WANT\s+WATER\b", "I would like some water, please.", "Article insertion"),
            (r"\bME\s+WANT\s+WATER\b", "I would like some water, please.", "Pronoun correction"),
            (r"\bI\s+FOOD\s+WANT\b", "I would like some food, please.", "SVO ordering & politeness"),
            (r"\bI\s+WANT\s+FOOD\b", "I would like some food, please.", "SVO ordering & politeness"),
            (r"\bME\s+FOOD\s+WANT\b", "I would like some food, please.", "Pronoun correction & SVO ordering"),
            (r"\bME\s+WANT\s+FOOD\b", "I would like some food, please.", "Pronoun correction"),
            # --- Without I (auto-insert 'I' as default subject) ---
            # Uses negative lookbehind to avoid matching when YOU is the subject
            (r"(?<!YOU )(?<!YOU\t)\bWANT\s+WATER\b", "I would like some water, please.", "Auto-I: want water resolution"),
            (r"\bWATER\s+WANT\b", "I would like some water, please.", "Auto-I: water want SVO resolution"),
            (r"(?<!YOU )(?<!YOU\t)\bWANT\s+FOOD\b", "I would like some food, please.", "Auto-I: want food resolution"),
            (r"\bFOOD\s+WANT\b", "I would like some food, please.", "Auto-I: food want SVO resolution"),
            # --- Single-word fallbacks (implicit 'I' subject) ---
            (r"\bWATER\b", "I need some water, please.", "Auto-I: single water sign"),
            (r"\bFOOD\b", "I would like some food, please.", "Auto-I: single food sign"),
            (r"\bI\s+WANT\b", "I would like this, please.", "General desire expression"),
            (r"\bWANT\b", "I would like this, please.", "Auto-I: single want sign"),
            (r"\bI\s+HELP\s+YOU\b", "I can help you.", "Assistance offer resolution"),
            (r"\bDISAGREE\b", "I disagree with this.", "Negation resolution"),
            (r"\bI\s+HUNGRY\b", "I am hungry.", "Auxiliary verb insertion"),
            (r"\bME\s+HUNGRY\b", "I am hungry.", "Pronoun & auxiliary correction"),
            (r"\bHUNGRY\b", "I am feeling hungry.", "State of being expansion"),
            (r"\bI\s+THIRSTY\b", "I am thirsty.", "Auxiliary verb insertion"),
            (r"\bI\s+TIRED\b", "I am feeling tired.", "Auxiliary verb insertion"),
            (r"\bME\s+TIRED\b", "I am feeling tired.", "Pronoun & auxiliary correction"),
            (r"\bI\s+SICK\b", "I am feeling unwell.", "Continuous state formation"),
            (r"\bME\s+SICK\b", "I am feeling unwell.", "Pronoun & continuous state formation"),
            (r"\bDOCTOR\s+NEED\b", "I need a doctor urgently.", "Subject & urgency insertion"),
            (r"\bI\s+DOCTOR\s+NEED\b", "I need a doctor urgently.", "Article insertion & SVO ordering"),
            (r"\bDOCTOR\b", "I need to see a doctor.", "Medical request resolution"),
            (r"\bI\s+MEDICINE\s+NEED\b", "I need medicine.", "SVO ordering"),
            (r"\bPAIN\s+HERE\b", "I am experiencing pain here.", "Subject & verb insertion"),
            (r"\bEMERGENCY\s+CALL\b", "Please call emergency services immediately.", "Imperative enhancement"),
            (r"\bEMERGENCY\b", "This is an emergency, please assist.", "Emergency declaration"),

            # Actions & Directions
            (r"\bI\s+HOME\s+GO\b", "I am going home.", "Present continuous refinement"),
            (r"\bME\s+HOME\s+GO\b", "I am going home.", "Pronoun & tense refinement"),
            (r"\bI\s+GO\s+HOME\b", "I am going home.", "Continuous verb refinement"),
            (r"\bI\s+NOT\s+UNDERSTAND\b", "I do not understand.", "Auxiliary negative insertion"),
            (r"\bME\s+NOT\s+KNOW\b", "I do not know.", "Pronoun & auxiliary insertion"),
            (r"\bI\s+NOT\s+KNOW\b", "I do not know.", "Auxiliary negative insertion"),
            (r"\bNICE\s+MEET\s+YOU\b", "It is nice to meet you.", "Conventional greeting formatting"),
            (r"\bTHANK\s+YOU\b", "Thank you very much.", "Polite gratitude expression"),
            (r"\bGOOD\s+MORNING\b", "Good morning!", "Salutation formatting"),
            (r"\bGOOD\s+NIGHT\b", "Good night!", "Salutation formatting"),
            (r"\bYES\b", "Yes, that is correct.", "Affirmation resolution"),
            (r"\bNO\b", "No, thank you.", "Polite negation resolution"),
            (r"\bSTOP\b", "Please stop.", "Command resolution"),
        ]

    def deduplicate_consecutive_words_and_phrases(self, text: str):
        """
        Removes consecutive duplicate words and multi-word phrases.
        Example: 'WELL DONE WELL DONE' -> 'WELL DONE'
        Example: 'LIKE LIKE' -> 'LIKE'
        Example: 'HELLO HELLO' -> 'HELLO'
        Preserves natural double letters inside words (e.g. 'HELLO', 'GOOD').
        """
        if not text or not text.strip():
            return text, False

        processed = text.strip()
        original = processed

        # 1. Known multi-word phrases deduplication
        known_phrases = [
            r"WELL\s+DONE",
            r"THUMBS\s+UP",
            r"THUMBS\s+DOWN",
            r"I\s+LOVE\s+YOU",
            r"CALL\s+ME",
            r"GOOD\s+JOB",
            r"THANK\s+YOU",
            r"GOOD\s+MORNING",
            r"GOOD\s+NIGHT",
            r"PLEASE\s+HELP",
            r"NICE\s+MEET\s+YOU",
        ]
        for phrase in known_phrases:
            regex = rf"\b({phrase})(?:\s+(?:{phrase}))+\b"
            processed = re.sub(regex, r"\1", processed, flags=re.IGNORECASE)

        # 2. General 2-word phrase deduplication (e.g. 'ME HUNGRY ME HUNGRY' -> 'ME HUNGRY')
        two_word_regex = r"\b([A-Za-z]+(?:\'[A-Za-z]+)?\s+[A-Za-z]+(?:\'[A-Za-z]+)?)(?:\s+\1\b)+"
        for _ in range(2):
            processed = re.sub(two_word_regex, r"\1", processed, flags=re.IGNORECASE)

        # 3. Consecutive identical single-word deduplication (e.g. 'LIKE LIKE' -> 'LIKE')
        single_word_regex = r"\b([A-Za-z]+(?:\'[A-Za-z]+)?)(?:\s+\1\b)+"
        for _ in range(3):
            processed = re.sub(single_word_regex, r"\1", processed, flags=re.IGNORECASE)

        changed = (processed.strip() != original.strip())
        return processed.strip(), changed

    def merge_fingerspelled_letters(self, text: str) -> str:
        """
        Detects sequences of isolated uppercase letters and merges them into words.
        Example: 'H E L L O WORLD' -> 'HELLO WORLD'
        Example: 'T H U M B S  U P' -> 'THUMBS UP'
        """
        tokens = text.strip().split()
        if not tokens:
            return ""

        merged = []
        letter_buffer = []

        for token in tokens:
            if len(token) == 1 and token.isalpha():
                letter_buffer.append(token)
            else:
                if letter_buffer:
                    merged.append("".join(letter_buffer))
                    letter_buffer = []
                merged.append(token)

        if letter_buffer:
            merged.append("".join(letter_buffer))

        return " ".join(merged)

    def refine_offline(self, input_text: str) -> Dict[str, Any]:
        """
        Executes local, deterministic grammar correction on Sign Language text.
        Works 100% offline without network or third-party dependencies.
        """
        if not input_text or not input_text.strip():
            return {
                "original_text": "",
                "refined_text": "",
                "mode": "offline_rule_based",
                "rules_applied": [],
                "confidence": 1.0,
                "notes": "Empty text provided"
            }

        original = input_text.strip()
        rules_applied = []

        # Step 1: Normalize spacing and case
        processed = " ".join(original.split())

        # Step 2: Merge fingerspelled letters (e.g. H E L L O -> HELLO)
        merged = self.merge_fingerspelled_letters(processed)
        if merged != processed:
            rules_applied.append("Merged fingerspelled letters into complete words")
            processed = merged

        # Step 2b: Deduplicate consecutive words & repeated multi-word phrases (e.g. WELL DONE WELL DONE -> WELL DONE)
        deduped, dedup_changed = self.deduplicate_consecutive_words_and_phrases(processed)
        if dedup_changed:
            rules_applied.append("Deduplicated repeated words/phrases")
            processed = deduped

        upper_processed = processed.upper()
        pattern_matched = False

        # Step 3: Match ISL gloss patterns
        for pattern, replacement, rule_desc in self.gloss_patterns:
            if re.search(pattern, upper_processed, re.IGNORECASE):
                # Replace exact match
                new_text = re.sub(pattern, replacement, upper_processed, count=1, flags=re.IGNORECASE)
                if new_text != upper_processed:
                    upper_processed = new_text
                    rules_applied.append(rule_desc)
                    pattern_matched = True
                    break

        # Step 4: General grammatical corrections if no specific template matched
        if not pattern_matched:
            # Replace ME with I when used as subject
            if re.match(r"^ME\s+", upper_processed, re.IGNORECASE):
                upper_processed = re.sub(r"^ME\s+", "I ", upper_processed, flags=re.IGNORECASE)
                rules_applied.append("Subject pronoun resolution ('ME' -> 'I')")

            # Auto-prepend 'I' when sentence starts with action/object words (implicit subject)
            # e.g. "WANT FOOD" -> "I WANT FOOD", "FOOD WANT" -> "I FOOD WANT"
            implicit_i_starters = [
                "WANT", "FOOD", "WATER", "HUNGRY", "THIRSTY", "TIRED", "SICK",
                "NEED", "LIKE", "LOVE", "HELP", "GO", "COME", "STOP", "DOCTOR",
                "MEDICINE", "HOME", "SCHOOL", "WORK"
            ]
            first_word = upper_processed.split()[0] if upper_processed.split() else ""
            if first_word in implicit_i_starters and not re.match(r"^(I|ME|YOU|WE|THEY|HE|SHE)\s+", upper_processed, re.IGNORECASE):
                upper_processed = "I " + upper_processed
                rules_applied.append("Auto-inserted 'I' as implicit subject")

            # Missing 'am' for 'I [Adjective]'
            for adj in ["HUNGRY", "THIRSTY", "TIRED", "READY", "FINE", "HAPPY", "SAD", "OKAY", "GOOD"]:
                pattern = rf"\bI\s+{adj}\b"
                if re.search(pattern, upper_processed, re.IGNORECASE):
                    upper_processed = re.sub(pattern, f"I am {adj.lower()}", upper_processed, flags=re.IGNORECASE)
                    rules_applied.append(f"Copula 'am' insertion before {adj.lower()}")

            # Missing 'is' for '[Noun] WHAT'
            if re.search(r"\bWHAT\b", upper_processed, re.IGNORECASE) and not re.search(r"\bIS\b", upper_processed, re.IGNORECASE):
                upper_processed = re.sub(r"(\w+)\s+WHAT", r"What is \1?", upper_processed, flags=re.IGNORECASE)
                rules_applied.append("WH-Question inversion")

            # Step 5: Capitalization & punctuation
            result = upper_processed.strip()
            if result.isupper():
                result = result.capitalize()
            else:
                result = result[0].upper() + result[1:] if len(result) > 1 else result.upper()

            # Add terminating punctuation if missing
            if not result.endswith((".", "?", "!")):
                if any(w in result.lower().split() for w in ["what", "where", "why", "how", "when", "who"]):
                    result += "?"
                else:
                    result += "."
                rules_applied.append("Terminal punctuation added")
        else:
            result = upper_processed.strip()

        return {
            "original_text": original,
            "refined_text": result,
            "mode": "offline_rule_based",
            "rules_applied": rules_applied if rules_applied else ["Punctuation & casing normalization"],
            "confidence": 0.96 if pattern_matched else 0.85,
            "offline_ready": True
        }

    def refine(self, input_text: str, mode: str = "manual") -> Dict[str, Any]:
        """Unified grammar refinement entrypoint."""
        return self.refine_offline(input_text)
