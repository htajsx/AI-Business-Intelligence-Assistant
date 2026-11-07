# app/schemas/report.py
from typing import Any, Optional
from pydantic import BaseModel

class SampleSize(BaseModel):
    orders: int
    level: str
    revenue: float

class Scope(BaseModel):
    categoryMode: str
    stateMode: str
    periodMode: str
    isPartialPeriod: bool
    comparisonAvailable: bool
    sampleSize: SampleSize
    label: str
    visibleSections: list[str]
    comparisonWindows: dict[str, Optional[str]]
    comparisonNote: Optional[str] = None

class KpiItem(BaseModel):
    key: str
    label: str
    value: Optional[float] = None
    previousValue: Optional[float] = None
    delta: Optional[float] = None
    deltaPct: Optional[float] = None
    benchmarkValue: Optional[float] = None
    benchmarkLabel: Optional[str] = None
    unit: str
    direction: str
    tone: str
    status: Optional[str] = None
    subtitle: Optional[str] = None

class PeriodComparisonItem(BaseModel):
    metric: str
    current: Optional[str] = None
    previous: Optional[str] = None
    change: Optional[str] = None
    pct: Optional[str] = None
    isPositive: bool = True

class TrendPoint(BaseModel):
    month: str
    revenue: float
    orders: int
    aov: float
    prevRevenue: Optional[float] = None
    isPartial: bool = False
    momGrowthPct: Optional[float] = None

class TrendData(BaseModel):
    narrative: str
    series: list[TrendPoint]
    peakMonth: Optional[str] = None
    peakRevenue: Optional[float] = None

class CategoryItem(BaseModel):
    rank: int
    category: str
    rawCategory: str
    revenue: float
    orders: int
    sharePct: float
    growthPct: Optional[float] = None

class CategorySection(BaseModel):
    rankingCriteria: str
    minOrdersThreshold: int
    topByRevenue: list[CategoryItem]
    topByGrowth: list[CategoryItem]
    underperformers: list[CategoryItem]
    top3RevenueSharePct: float

class RegionItem(BaseModel):
    rank: int
    state: str
    name: str
    orders: int
    revenue: float
    sharePct: float
    avgDeliveryDays: Optional[float] = None
    onTimeRate: Optional[float] = None
    status: str

class CityItem(BaseModel):
    rank: int
    city: str
    state: str
    orders: int
    revenue: float
    aov: float

class PositionItem(BaseModel):
    title: str
    name: str
    rank: Optional[int] = None
    total: int
    sharePct: float
    revenue: float
    orders: int
    subtitle: Optional[str] = None

class YearOverviewRow(BaseModel):
    year: str
    revenue: float
    orders: int
    aov: float
    growthPct: Optional[float] = None
    isPartial: bool = False
    monthsCovered: Optional[int] = None
    growthNote: Optional[str] = None

class OperationItem(BaseModel):
    name: str
    score: float
    target: float
    unit: str
    status: str

class AnomalyItem(BaseModel):
    id: str
    metric: str
    subject: str
    observed: str
    baseline: str
    deviation: float
    severity: str
    direction: str
    description: str

class HighlightItem(BaseModel):
    id: str
    title: str
    description: str
    metric: str
    value: str

class RecommendationItem(BaseModel):
    priority: str
    action: str
    relatedKpi: str
    evidence: str
    expectedImpact: Optional[str] = None
    basis: Optional[str] = None

class ExecutiveSummaryItem(BaseModel):
    text: str
    tone: str

class ReportMeta(BaseModel):
    generatedAt: str
    requestedPeriod: str
    effectivePeriod: str
    filters: dict[str, Any]
    granularity: str
    comparisonAvailable: bool
    comparisonReason: Optional[str] = None
    comparisonWindows: dict[str, Optional[str]]
    comparisonNote: Optional[str] = None
    totalOrders: int
    totalRevenue: float
    dataSource: str
    isPartialPeriod: bool
    excludedPeriods: list[str] = []
    kpiDefinitions: list[dict[str, str]]
    limitations: list[str]
    validation: dict[str, Any]

class ReportResponse(BaseModel):
    title: str
    scope: Scope
    meta: ReportMeta
    executiveSummary: list[ExecutiveSummaryItem]
    kpis: list[KpiItem]
    periodComparison: list[PeriodComparisonItem]
    position: Optional[PositionItem] = None
    yearOverview: Optional[list[YearOverviewRow]] = None
    trend: TrendData
    categories: Optional[CategorySection] = None
    categoryDeepDive: Optional[list[RegionItem]] = None
    regions: Optional[list[RegionItem]] = None
    topCities: Optional[list[CityItem]] = None
    operations: list[OperationItem]
    anomalies: list[AnomalyItem]
    highlights: list[HighlightItem]
    recommendations: list[RecommendationItem]


class ReportRequest(BaseModel):
    period: Optional[str] = "All time"
    category: Optional[str] = "All categories"
    state: Optional[str] = "All states"
    granularity: Optional[str] = "Month"
