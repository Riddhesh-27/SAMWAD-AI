"""
SAMVAD AI — Grammar Refinement API Routes
Exposes both offline deterministic rule-based grammar correction and optional online enhancement.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.services.grammar_service import GrammarRefiner

router = APIRouter(prefix="/api/grammar", tags=["Grammar"])

refiner = GrammarRefiner()


class GrammarRequest(BaseModel):
    text: str = Field(..., description="Raw accumulated sign language gloss or sentence text")
    mode: Optional[str] = Field("manual", description="Either 'manual' or 'auto'")


@router.post("/refine")
async def refine_grammar(payload: GrammarRequest):
    """
    Refines input sign language gloss/text into natural, grammatically coherent English.
    Operates completely offline with zero cloud dependency.
    """
    result = refiner.refine(payload.text, mode=payload.mode)
    return result
