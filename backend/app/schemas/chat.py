from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    message: Optional[str] = Field(
        default=None, max_length=500, description="Question text, at most 500 characters."
    )
    question: Optional[str] = Field(
        default=None, max_length=500, description="Question text, at most 500 characters."
    )
    conversation_id: Optional[str] = None


class ChartSpec(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: str
    x: Optional[str] = None
    y: Optional[str] = None
    title: Optional[str] = ""
    yFormat: Optional[str] = None
    highlight: Optional[Any] = None
    subtitle: Optional[str] = None


class TableSpec(BaseModel):
    model_config = ConfigDict(extra="ignore")
    columns: List[str] = []
    rows: List[Dict[str, Any]] = []


class HeadlineBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["headline"] = "headline"
    text: str = Field(..., max_length=200)


class MetricCardItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    label: str
    value: Any
    unit: Optional[str] = None
    delta: Optional[str] = None
    tone: Optional[Literal["good", "bad", "neutral"]] = "neutral"
    note: Optional[str] = None


class MetricCardsBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["metric_cards"] = "metric_cards"
    items: List[MetricCardItem] = Field(default_factory=list)


class ChartBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["chart"] = "chart"
    spec: Dict[str, Any]
    ref: Optional[str] = None


class TableBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["table"] = "table"
    columns: Optional[List[str]] = None
    rows: Optional[List[Dict[str, Any]]] = None
    ref: Optional[str] = None
    max_rows: Optional[int] = None


class InsightBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["insight"] = "insight"
    text: str
    evidence: Optional[List[Dict[str, Any]]] = None


class RecommendationItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    action: str
    evidence: str
    confidence: Literal["high", "medium", "low"] = "medium"
    measure: Optional[str] = None


class RecommendationsBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["recommendations"] = "recommendations"
    items: List[RecommendationItem] = Field(default_factory=list)


class CaveatBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["caveat"] = "caveat"
    text: str
    level: Literal["info", "warn"] = "info"


class TextBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["text"] = "text"
    markdown: str


class FollowUpsBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: Literal["follow_ups"] = "follow_ups"
    items: List[str] = Field(default_factory=list)


ChatBlock = Union[
    HeadlineBlock,
    MetricCardsBlock,
    ChartBlock,
    TableBlock,
    InsightBlock,
    RecommendationsBlock,
    CaveatBlock,
    TextBlock,
    FollowUpsBlock,
]


class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    answer: str
    insight: str
    sql: Optional[str] = None
    sql_query: Optional[str] = None
    results: List[Dict[str, Any]] = []
    table: Optional[TableSpec] = None
    chart: Optional[ChartSpec] = None
    tables_used: List[str] = []
    tools_called: List[str] = []
    latency_ms: int = 0
    status: str = "ok"
    model: Optional[str] = None
    cached: bool = False
    intent: Optional[str] = None
    blocks: Optional[List[Dict[str, Any]]] = None
    follow_ups: Optional[List[str]] = None
    scope: Optional[Dict[str, Any]] = None
    caveats: Optional[List[str]] = None
