/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { DatasetMetadata, RawListing, CleanedListing } from "../types/dataset";
import { activeBuildingsInfo } from "../prdDataset";
import { getActualContractStore, saveActualContractRent } from "../services/actualContractStore";
import {
  parseExcelFile,
  validateAndCleanListings,
  exportValidationErrorsToExcel,
  generateSampleExcelTemplate,
  calculateFileHash,
  ExcelParseDiagnostic,
  ExcelValidationSummary,
  COLUMN_GROUPS,
  ColumnGroup,
} from "../services/excelEngine";
import {
  buildEfficiencyRateTable,
  buildRegionalConvertedListings,
  aggregateBuildingMedians,
  calculateAdjustmentFactors,
} from "../services/rentalCalculationEngine";
import {
  datasetRepository,
  listingRepository,
  mappingRepository,
  valuationRepository,
} from "../db/repository";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Info,
  Layers,
  ArrowRight,
  Settings2,
  RefreshCw,
  XCircle,
  HelpCircle,
  Search,
  Filter,
} from "lucide-react";

interface UploadDatasetViewProps {
  onUploadSuccess: (newDatasetId: string) => void;
  existingDatasets: DatasetMetadata[];
}

export function UploadDatasetView({
  onUploadSuccess,
  existingDatasets,
}: UploadDatasetViewProps) {
  const [refYear, setRefYear] = useState<number>(2026);
  const [refQuarter, setRefQuarter] = useState<1 | 2 | 3 | 4>(2);
  const [operatorName, setOperatorName] = useState<string>("자산운영담당자(김우체)");
  const [notes, setNotes] = useState<string>("");
  const [actualContractRents, setActualContractRents] = useState<Record<string, number>>(() => getActualContractStore());
  const [file, setFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsedRaw, setParsedRaw] = useState<RawListing[] | null>(null);
  const [validationSummary, setValidationSummary] = useState<ExcelValidationSummary | null>(null);
  const [diagnostic, setDiagnostic] = useState<ExcelParseDiagnostic | null>(null);
  const [fileHash, setFileHash] = useState<string>("");

  const [previewFilter, setPreviewFilter] = useState<"all" | "valid" | "warning" | "invalid">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Column group collapse/expand state (1행 그룹)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    summary: true, // "주요정보(요약)" expanded by default
    crawler: false,
    listing: false,
    building: false,
    "building-register": false,
    additional: false,
    "conversion-rate": false,
  });

  const activeColumns = React.useMemo(() => {
    const cols: {
      groupId: string;
      groupLabel: string;
      key: string;
      label: string;
      index: number;
    }[] = [];

    COLUMN_GROUPS.forEach((group) => {
      if (expandedGroups[group.id]) {
        group.columns.forEach((col) => {
          cols.push({
            groupId: group.id,
            groupLabel: group.label,
            key: col.key,
            label: col.label,
            index: col.index,
          });
        });
      }
    });

    return cols;
  }, [expandedGroups]);

  // Duplicate Warning Modal states
  const [hashWarningModal, setHashWarningModal] = useState<{
    isOpen: boolean;
    existingDatasetId: string;
  }>({ isOpen: false, existingDatasetId: "" });

  const [sameQuarterModal, setSameQuarterModal] = useState<{
    isOpen: boolean;
    versionToCreate: number;
  }>({ isOpen: false, versionToCreate: 1 });

  // Load column mapping rule
  useEffect(() => {
    mappingRepository.getMappingRule().then(setMapping);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsLoading(true);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const calcHash = await calculateFileHash(arrayBuffer);
      setFileHash(calcHash);

      const nextVersion = getNextVersion(refYear, refQuarter);
      const tempDatasetId = `${refYear}-Q${refQuarter}-V${nextVersion}`;

      // Call automatic parsing engine on "통합데이터" sheet
      const parseResult = await parseExcelFile(arrayBuffer, tempDatasetId);
      setParsedRaw(parseResult.rawListings);
      setDiagnostic(parseResult.diagnostic);

      // Check duplicate hash
      const matchedHashDataset = existingDatasets.find((d) => d.fileHash === calcHash);
      if (matchedHashDataset) {
        setHashWarningModal({
          isOpen: true,
          existingDatasetId: matchedHashDataset.datasetId,
        });
      }

      // Run validation check
      const summary = validateAndCleanListings(parseResult.rawListings, refYear);
      summary.diagnostic = parseResult.diagnostic;
      setValidationSummary(summary);
    } catch (err: any) {
      alert(`Excel 파일 파싱 실패: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getNextVersion = (year: number, quarter: number) => {
    const matched = existingDatasets.filter(
      (d) => d.referenceYear === year && d.referenceQuarter === quarter
    );
    if (matched.length === 0) return 1;
    const maxVer = Math.max(...matched.map((d) => d.version));
    return maxVer + 1;
  };

  const handleSaveDataset = async () => {
    if (!parsedRaw || !validationSummary || !file) return;

    const matchedSameQuarter = existingDatasets.filter(
      (d) => d.referenceYear === refYear && d.referenceQuarter === refQuarter
    );

    const versionToCreate = matchedSameQuarter.length > 0 ? getNextVersion(refYear, refQuarter) : 1;

    if (matchedSameQuarter.length > 0 && !sameQuarterModal.isOpen) {
      setSameQuarterModal({
        isOpen: true,
        versionToCreate,
      });
      return;
    }

    const datasetId = `${refYear}-Q${refQuarter}-V${versionToCreate}`;
    setIsLoading(true);

    try {
      const metadata: DatasetMetadata = {
        datasetId,
        referenceYear: refYear,
        referenceQuarter: refQuarter,
        version: versionToCreate,
        status: "validated",
        originalFileName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: operatorName,
        fileSize: file.size,
        fileHash: fileHash || `hash-${Date.now()}`,
        totalRowCount: validationSummary.totalRowCount,
        validRowCount: validationSummary.validRowCount,
        invalidRowCount: validationSummary.invalidRowCount,
        duplicateRowCount: validationSummary.duplicateRowCount,
        uniqueBuildingCount: validationSummary.uniqueBuildingCount,
        notes: notes || `${refYear}년 ${refQuarter}분기 임대기준가격 매물 데이터 업로드`,
        calculationVersion: "v1.0.0",
        formulaVersion: "FACTOR-MEDIAN-1.0",
        efficiencyRateVersion: `EFF-LOOKUP-${refYear}Q${refQuarter}`,
        applicationVersion: "1.3.0",
      };

      // Save to IndexedDB
      await datasetRepository.createDataset(metadata);
      await listingRepository.saveRawListings(datasetId, parsedRaw);
      await listingRepository.saveCleanedListings(
        datasetId,
        validationSummary.cleanedListings
      );

      // Compute Efficiency Rates, Converted Listings, Building Medians & Valuation
      const effTable = buildEfficiencyRateTable(parsedRaw, datasetId);
      const converted = buildRegionalConvertedListings(parsedRaw, effTable);
      const bMedians = aggregateBuildingMedians(converted, parsedRaw, datasetId);
      const valResults = calculateAdjustmentFactors(bMedians, datasetId);

      await listingRepository.saveBuildingMedians(datasetId, bMedians);
      await valuationRepository.saveCalculationResults(valResults);

      // Save column mapping rule
      await mappingRepository.saveMappingRule(mapping);

      alert(`[${datasetId}] 임대기준가격 매물 데이터셋 반입 및 산정이 완료되었습니다!`);
      onUploadSuccess(datasetId);
    } catch (err: any) {
      alert(`데이터셋 저장 실패: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
      setSameQuarterModal({ isOpen: false, versionToCreate: 1 });
    }
  };

  const filteredPreviewListings = (validationSummary?.cleanedListings || []).filter((item) => {
    if (previewFilter === "valid" && (!item.validation.isValid || item.validation.warningCodes.length > 0)) return false;
    if (previewFilter === "warning" && item.validation.warningCodes.length === 0) return false;
    if (previewFilter === "invalid" && item.validation.isValid) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.buildingName || "").toLowerCase().includes(q);
      const matchAddress = (item.roadAddress || item.address || "").toLowerCase().includes(q);
      const matchId = (item.listingId || "").toLowerCase().includes(q);
      return matchName || matchAddress || matchId;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Notice Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 md:p-5 flex items-start gap-3 text-blue-900 shadow-sm">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs md:text-sm leading-relaxed space-y-1">
          <p className="font-bold">임대료 기준가격 매물 데이터 Excel 업로드 및 자동 인식 안내</p>
          <p className="text-blue-800">
            "통합데이터" 시트의 2행 헤더를 기반으로 43개 전체 열 구조를 수동 매핑 없이 자동 인식합니다.
            알스퀘어 및 네모 크롤링 원본 데이터(M~AQ열)를 최우선 인식하며, 면적당 보증금·임대료·환산임대료를 단가로 자동 산출합니다.
          </p>
        </div>
      </div>

      {/* Input Form & File Drop Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Dataset Metadata Input */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-600" />
            1. 분기 데이터 메타데이터 설정
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">기준연도</label>
              <select
                value={refYear}
                onChange={(e) => setRefYear(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value={2026}>2026년</option>
                <option value={2025}>2025년</option>
                <option value={2024}>2024년</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">기준분기</label>
              <select
                value={refQuarter}
                onChange={(e) => setRefQuarter(Number(e.target.value) as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>1분기 (1Q)</option>
                <option value={2}>2분기 (2Q)</option>
                <option value={3}>3분기 (3Q)</option>
                <option value={4}>4분기 (4Q)</option>
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-600 font-semibold mb-1">업로드 담당자</label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
              placeholder="담당자 이름 기재"
            />
          </div>

          <div className="text-xs">
            <label className="block text-slate-600 font-semibold mb-1">업로드 비고 (선택)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="예: 2026년 2분기 알스퀘어 및 네모 정기 보정 데이터 반입"
            />
          </div>

          {/* 2. Previous Quarter Own Building Actual Contract Rent Inputs */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                2. 전분기 우리매물 실계약단가 입력
              </h4>
              <span className="text-[10px] text-indigo-600 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                판단반영 참고용
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              반입 자료 산정 시 담당자 판단 반영계수 참고 지표로 자동 반영됩니다.
            </p>
            <div className="space-y-1.5">
              {activeBuildingsInfo.map((b) => {
                const val = actualContractRents[b.id] ?? 10000;
                return (
                  <div key={b.id} className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-xs shadow-2xs">
                    <span className="font-bold text-slate-700 text-xs flex items-center gap-1">
                      <span>{b.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">({b.city})</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          setActualContractRents((prev) => ({ ...prev, [b.id]: num }));
                          saveActualContractRent(b.id, num);
                        }}
                        className="w-24 px-2 py-0.5 text-right font-mono font-extrabold text-indigo-900 bg-slate-50 border border-indigo-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] font-bold text-slate-500">원/㎡</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Download Sample Button */}
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">양식이 필요한 경우:</span>
            <button
              onClick={generateSampleExcelTemplate}
              className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              샘플 템플릿 다운로드 (.xlsx)
            </button>
          </div>
        </div>

        {/* Right 7 Cols: File Drop & Upload Zone */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-start">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel 매물 파일 업로드 (.xlsx, .xls)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              '통합데이터' 시트 자동 감지
            </span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processFile(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all flex flex-col items-center justify-center min-h-[160px] cursor-pointer ${
              isDragging
                ? "border-indigo-500 bg-indigo-50/50 shadow-inner"
                : file
                ? "border-emerald-400 bg-emerald-50/20"
                : "border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 shadow-2xs"
            }`}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {isLoading ? (
              <div className="flex flex-col items-center gap-2 text-indigo-600">
                <RefreshCw className="w-7 h-7 animate-spin" />
                <span className="text-xs font-bold">Excel '통합데이터' 시트 자동 인식 중...</span>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-1.5">
                <FileSpreadsheet className="w-9 h-9 text-emerald-600" />
                <div>
                  <p className="text-xs font-extrabold text-slate-800">{file.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • SHA-256: {fileHash.slice(0, 12)}...
                  </p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold mt-1">
                  파싱 완료 - 하단 진단 결과 확인
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100/80 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-extrabold text-indigo-950 px-2">
                  '임대료 기준가격 매물 데이터.xlsx' 파일을 이곳에 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-[11px] text-slate-500 font-medium max-w-md">
                  알스퀘어·네모 크롤링 43개 전체 열 구조 및 2행 헤더를 자동으로 인식하고 검증합니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validation & Diagnostics Result Section */}
      {validationSummary && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold font-mono">
                  3. 자동 인식 및 정합성 진단 결과
                </span>
                {diagnostic?.columnMappingError ? (
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">
                    열 매핑 경고
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">
                    43개 열 자동 인식 완료
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-slate-800 mt-1">
                업로드 파일 진단 및 검증 요약 리포트
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  exportValidationErrorsToExcel(
                    validationSummary.cleanedListings,
                    `${refYear}-Q${refQuarter}`
                  )
                }
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-2 rounded-xl transition"
              >
                <Download className="w-3.5 h-3.5" />
                오류내역 Excel 다운로드
              </button>

              <button
                onClick={handleSaveDataset}
                disabled={isLoading}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition"
              >
                <span>데이터셋 생성 및 검증 저장</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Diagnostic Header & Structural Metadata */}
          {diagnostic && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400 text-[10px] block">인식 시트명</span>
                <span className="font-bold text-slate-800 font-mono text-sm">
                  {diagnostic.recognizedSheetName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">헤더 행 번호</span>
                <span className="font-bold text-slate-800 font-mono text-sm">
                  {diagnostic.headerRowNumber}행 헤더 (1행 그룹)
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">출처별 건수</span>
                <span className="font-bold text-slate-800 font-mono text-sm">
                  알스퀘어: {diagnostic.rsquareCount}건 / 네모: {diagnostic.nemoCount}건
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">진단 상태</span>
                <span className="font-bold font-mono text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  정상 파싱
                </span>
              </div>
            </div>
          )}

          {/* Structural Field Validity Grid */}
          {diagnostic && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                주요 항목별 유효 필드 수 수집 모니터링
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">월임대료 유효</span>
                  <span className="font-bold font-mono text-slate-800">
                    {diagnostic.validMonthlyRentCount} / {diagnostic.totalRowCount}건
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">전용면적 유효</span>
                  <span className="font-bold font-mono text-slate-800">
                    {diagnostic.validExclusiveAreaCount} / {diagnostic.totalRowCount}건
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">지역 유효</span>
                  <span className="font-bold font-mono text-slate-800">
                    {diagnostic.validRegionCount} / {diagnostic.totalRowCount}건
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">권역 유효</span>
                  <span className="font-bold font-mono text-slate-800">
                    {diagnostic.validZoneCount} / {diagnostic.totalRowCount}건
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">연면적 유효</span>
                  <span className="font-bold font-mono text-slate-800">
                    {diagnostic.validGrossAreaCount} / {diagnostic.totalRowCount}건
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">준공연도 유효</span>
                  <span className="font-bold font-mono text-slate-800">
                    {diagnostic.validBuiltYearCount} / {diagnostic.totalRowCount}건
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Validation Record Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 text-[10px] block">전체 매물 행 수</span>
              <span className="text-lg font-extrabold font-mono text-slate-800 mt-0.5 block">
                {validationSummary.totalRowCount.toLocaleString()} 건
              </span>
            </div>

            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
              <span className="text-emerald-700 text-[10px] block font-bold">정상 매물 행 수</span>
              <span className="text-lg font-extrabold font-mono text-emerald-800 mt-0.5 block">
                {validationSummary.validRowCount.toLocaleString()} 건
              </span>
            </div>

            <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100">
              <span className="text-amber-700 text-[10px] block font-bold">Warning 매물 수</span>
              <span className="text-lg font-extrabold font-mono text-amber-800 mt-0.5 block">
                {validationSummary.warningRowCount.toLocaleString()} 건
              </span>
            </div>

            <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
              <span className="text-rose-700 text-[10px] block font-bold">Fatal Invalid 행 수</span>
              <span className="text-lg font-extrabold font-mono text-rose-800 mt-0.5 block">
                {validationSummary.invalidRowCount.toLocaleString()} 건
              </span>
            </div>

            <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
              <span className="text-indigo-700 text-[10px] block font-bold">고유 건물 수</span>
              <span className="text-lg font-extrabold font-mono text-indigo-900 mt-0.5 block">
                {validationSummary.uniqueBuildingCount.toLocaleString()} 개동
              </span>
            </div>
          </div>

          {/* Detailed Error Breakdown */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              세부 예외·Warning 분류 요약
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600 font-medium pt-1">
              <div>
                연면적 누락 (Warning):{" "}
                <span className="font-mono text-amber-700 font-bold">
                  {validationSummary.grossFloorAreaMissingCount}건
                </span>
              </div>
              <div>
                주소 누락:{" "}
                <span className="font-mono text-slate-800 font-bold">
                  {validationSummary.addressMissingCount}건
                </span>
              </div>
              <div>
                월세 오류 (Fatal):{" "}
                <span className="font-mono text-rose-700 font-bold">
                  {validationSummary.rentErrorCount}건
                </span>
              </div>
              <div>
                전용면적 오류 (Fatal):{" "}
                <span className="font-mono text-rose-700 font-bold">
                  {validationSummary.exclusiveAreaErrorCount}건
                </span>
              </div>
            </div>
          </div>

          {/* Column Group Collapse/Expand Control */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                컬럼 그룹 접기/펼치기 (1행 그룹 기준)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGroups({
                      summary: true,
                      crawler: true,
                      listing: true,
                      building: true,
                      "building-register": true,
                      additional: true,
                      "conversion-rate": true,
                    })
                  }
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  전체 펼치기
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGroups({
                      summary: true,
                      crawler: false,
                      listing: false,
                      building: false,
                      "building-register": false,
                      additional: false,
                      "conversion-rate": false,
                    })
                  }
                  className="text-[11px] font-semibold text-slate-500 hover:underline"
                >
                  주요정보(요약)만 보기
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs">
              {COLUMN_GROUPS.map((grp) => {
                const isExpanded = expandedGroups[grp.id];
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() =>
                      setExpandedGroups((prev) => ({
                        ...prev,
                        [grp.id]: !prev[grp.id],
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                      isExpanded
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>
                      {grp.label} [{grp.startColumn}:{grp.endColumn}]
                    </span>
                    <span className="text-[10px] font-mono">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Preview Table */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">
                  매물 데이터 및 단위단가 산출 결과 미리보기
                </h4>
                <span className="text-xs text-slate-500 font-mono">
                  (총 {filteredPreviewListings.length}건 표시)
                </span>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewFilter("all")}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      previewFilter === "all" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setPreviewFilter("valid")}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      previewFilter === "valid" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    정상
                  </button>
                  <button
                    onClick={() => setPreviewFilter("warning")}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      previewFilter === "warning" ? "bg-white text-amber-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Warning
                  </button>
                  <button
                    onClick={() => setPreviewFilter("invalid")}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      previewFilter === "invalid" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    오류
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="건물명 / 주소 검색..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-44 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-bold text-slate-600">
                  {/* Row 1: Group Headers */}
                  <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-700">
                    <th className="p-2 text-center border-r border-slate-200" rowSpan={2}>
                      행
                    </th>
                    {COLUMN_GROUPS.filter((g) => expandedGroups[g.id]).map((group) => (
                      <th
                        key={group.id}
                        colSpan={group.columns.length}
                        className="p-2 text-center border-r border-slate-200 bg-indigo-50/70 text-indigo-900 font-extrabold"
                      >
                        {group.label} ({group.startColumn}~{group.endColumn})
                      </th>
                    ))}
                    <th className="p-2 text-center" rowSpan={2}>
                      검증상태
                    </th>
                  </tr>

                  {/* Row 2: Field Names (2행) */}
                  <tr>
                    {activeColumns.map((col) => (
                      <th
                        key={`${col.groupId}-${col.key}`}
                        className="p-2 border-r border-slate-200 whitespace-nowrap bg-slate-50 font-bold text-slate-700"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPreviewListings.slice(0, 50).map((item) => {
                    const isWarn = item.validation.warningCodes.length > 0;
                    const isErr = !item.validation.isValid;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition ${
                          isErr ? "bg-rose-50/30" : isWarn ? "bg-amber-50/20" : ""
                        }`}
                      >
                        <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-100">
                          {item.rowNumber}
                        </td>

                        {activeColumns.map((col) => {
                          const rawVal = item.rawRowData?.[col.index];
                          let displayVal = "-";
                          if (rawVal !== null && rawVal !== undefined && rawVal !== "") {
                            if (typeof rawVal === "number") {
                              displayVal = Number.isInteger(rawVal)
                                ? rawVal.toLocaleString()
                                : rawVal.toLocaleString(undefined, { maximumFractionDigits: 4 });
                            } else {
                              displayVal = String(rawVal);
                            }
                          }

                          return (
                            <td
                              key={`${col.groupId}-${col.key}`}
                              className="p-2 border-r border-slate-100 font-mono text-slate-700 whitespace-nowrap"
                            >
                              {displayVal}
                            </td>
                          );
                        })}

                        <td className="p-2 text-center whitespace-nowrap">
                          {isErr ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                              <XCircle className="w-3 h-3" />
                              오류
                            </span>
                          ) : isWarn ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              경고
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              정상
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Same Quarter Version Modal */}
      {sameQuarterModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <Layers className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-800">
                동일 분기 데이터셋 존재 안내
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {refYear}년 {refQuarter}분기 데이터가 이미 존재합니다. 기존 데이터를 유지하고 새 버전{" "}
              <span className="font-mono font-bold text-indigo-600">
                V{sameQuarterModal.versionToCreate}
              </span>
              로 업로드하시겠습니까?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSameQuarterModal({ isOpen: false, versionToCreate: 1 })}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                취소
              </button>
              <button
                onClick={handleSaveDataset}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
              >
                새 버전 V{sameQuarterModal.versionToCreate}으로 업로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hash Warning Modal */}
      {hashWarningModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-800">
                중복 파일 업로드 경고
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              동일한 내용의 파일이 이미{" "}
              <span className="font-mono font-bold text-amber-700">
                {hashWarningModal.existingDatasetId}
              </span>{" "}
              데이터셋으로 저장되어 있습니다. 계속해서 업로드를 진행하시겠습니까?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setHashWarningModal({ isOpen: false, existingDatasetId: "" })}
                className="px-4 py-2 text-xs font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-xl"
              >
                업로드 취소
              </button>
              <button
                onClick={() => setHashWarningModal({ isOpen: false, existingDatasetId: "" })}
                className="px-4 py-2 text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 rounded-xl"
              >
                확인 및 진행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
