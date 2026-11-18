from app.services.grammar_service import GrammarRefiner
r = GrammarRefiner()
tests = [
    ('THUMBS UP', 'Well done! Excellent work.'),
    ('HELLO', 'Hello! Greetings.'),
    ('WELL DONE', 'Well done! Excellent work.'),
    ('OKAY', 'Okay, understood and agreed.'),
    ('YOU NAME WHAT', 'What is your name?'),
    ('I WATER WANT', 'I would like some water, please.'),
    ('ME HUNGRY', 'I am hungry.'),
    ('PLEASE HELP', 'Please help me.'),
    ('I LOVE YOU', 'I love you very much.'),
    ('THANK YOU', 'Thank you very much.'),
    ('HELLO HOW YOU', 'Hello! How are you doing today?'),
]
print('=== Grammar Refiner Tests ===')
all_pass = True
for text, expected in tests:
    result = r.refine(text)
    got = result['refined_text']
    status = 'PASS' if got == expected else 'FAIL'
    if got != expected:
        all_pass = False
    print(f'  {status}: "{text}" => "{got}"')
print()
print('Result:', 'ALL TESTS PASSED' if all_pass else 'SOME TESTS FAILED')
