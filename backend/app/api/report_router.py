# app/api/report_router.py
from fastapi import APIRouter

from app.schemas.report import ReportRequest, ReportResponse
from app.report.service import generate_report as _generate_report

router = APIRouter()


@router.post("/report", response_model=ReportResponse)
def generate_report(req: ReportRequest):
    return _generate_report(req)
