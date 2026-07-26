/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { ConfirmedValuation, DatasetMetadata } from "../types/dataset";
import { datasetRepository, valuationRepository } from "../db/repository";
import { clearAllHistoryDatabase, reseedStandardHistoryDatabase, deleteDatasetsByIds } from "../db/idb";
import { History, Search, Calendar, CheckCircle2, Eye, X, Trash2, RefreshCw, CheckSquare, Square } from "lucide-react";

export function QuarterlyHistoryView() {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [confirmedValuations, setConfirmedValuations] = useState<ConfirmedValuation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedDatasetIdFilter, setSelectedDatasetIdFilter] = useState<string>("all");
  const [selectedHistoryModalDataset, setSelectedHistoryModalDataset] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const dsList = await datasetRepository.listDatasets(true); // include archived
      setDatasets(dsList);
      setSelectedIds([]);

      const allValuations = await valuationRepository.listAllConfirmedValuations();
      setConfirmedValuations(allValuations);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === datasets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(datasets.map((d) => d.datasetId));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("삭제할 데이터셋 항목을 선택해주세요.");
      return;
    }
    if (!window.confirm(`선택한 ${selectedIds.length}개의 데이터셋 이력을 삭제하시겠습니까?`)) {
      return;
    }
    setIsLoading(true);
    try {
      await deleteDatasetsByIds(selectedIds);
      await loadHistory();
      alert(`선택한 ${selectedIds.length}개 데이터셋 이력이 삭제되었습니다.`);
    } catch (err) {
      console.error(err);
      alert("선택 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSingle = async (datasetId: string) => {
    if (!window.confirm(`데이터셋 '${datasetId}' 이력을 삭제하시겠습니까?`)) {
      return;
    }
    setIsLoading(true);
    try {
      await deleteDatasetsByIds([datasetId]);
      await loadHistory();
      alert(`'${datasetId}' 데이터셋 이력이 삭제되었습니다.`);
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm("정말로 이력관리에 있는 모든 데이터셋 및 산정 내역을 삭제하시겠습니까?")) {
      return;
    }
    setIsLoading(true);
    try {
      await clearAllHistoryDatabase();
      await loadHistory();
      alert("이력 관리의 모든 데이터가 정상적으로 삭제되었습니다.");
    } catch (err) {
      console.error(err);
      alert("이력 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReseedStandardHistory = async () => {
    if (!window.confirm("2025년 2~4분기 및 2026년 1분기의 지정 임대기준가격표(당산 14000, 영등포 12700, 부산 8570, 대구 5200, 광주 6200)로 이력을 재구성하시겠습니까?")) {
      return;
    }
    setIsLoading(true);
    try {
      await reseedStandardHistoryDatabase();
      await loadHistory();
      alert("2025년 2분기 ~ 2026년 1분기 기준 임대가격표 데이터셋 이력이 재구성되었습니다.");
    } catch (err) {
      console.error(err);
      alert("데이터 재구성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const modalValuations = confirmedValuations.filter(
    (v) => v.datasetId === selectedHistoryModalDataset
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            분기별 적정 임대기준가격 산정 및 조정 확정 이력
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            과거 분기별 반입 원천 데이터, 보정계수, 담당자 조정 사유 및 최종 확정 결과 불변 이력 관리
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className={`px-3 py-2 border text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs ${
              selectedIds.length > 0
                ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-300 cursor-pointer"
                : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-600" />
            선택 삭제 {selectedIds.length > 0 && `(${selectedIds.length}개)`}
          </button>

          <button
            onClick={handleClearAllHistory}
            className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            이력 데이터 전체 삭제
          </button>

          <button
            onClick={handleReseedStandardHistory}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            2025Q2~2026Q1 표준이력 설정
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={datasets.length > 0 && selectedIds.length === datasets.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">데이터셋 ID</th>
                <th className="px-4 py-3.5">기준연도 / 분기</th>
                <th className="px-4 py-3.5">원본 파일명</th>
                <th className="px-4 py-3.5 text-right">매물 수</th>
                <th className="px-4 py-3.5">업로드 일시 / 담당자</th>
                <th className="px-4 py-3.5 text-center">상태</th>
                <th className="px-4 py-3.5 text-center">관리 / 상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    이력 로딩 중...
                  </td>
                </tr>
              ) : datasets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    저장된 분기 데이터셋 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                datasets.map((ds) => {
                  const isSelected = selectedIds.includes(ds.datasetId);
                  return (
                    <tr
                      key={ds.datasetId}
                      className={`hover:bg-slate-50 transition ${
                        isSelected ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(ds.datasetId)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-700">
                        {ds.datasetId}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {ds.referenceYear}년 {ds.referenceQuarter}분기 (V{ds.version})
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 truncate max-w-xs">
                        {ds.originalFileName}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                        {ds.totalRowCount.toLocaleString()} 건
                      </td>

                      <td className="px-4 py-3.5 text-slate-500">
                        <div>{new Date(ds.uploadedAt).toLocaleString("ko-KR")}</div>
                        <div className="text-[11px] text-slate-400">{ds.uploadedBy}</div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                            ds.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : ds.status === "calculated"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {ds.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedHistoryModalDataset(ds.datasetId)}
                            title="상세조회"
                            className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(ds.datasetId)}
                            title="삭제"
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Audit Modal */}
      {selectedHistoryModalDataset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">
                  데이터셋 [{selectedHistoryModalDataset}] 확정 내역 상세
                </h3>
              </div>
              <button
                onClick={() => setSelectedHistoryModalDataset(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalValuations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                해당 데이터셋에 대한 확정 보정 내역이 아직 저장되지 않았습니다.
              </p>
            ) : (
              <div className="space-y-3 text-xs">
                {modalValuations.map((v) => (
                  <div key={v.buildingId} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-800">{v.buildingId.toUpperCase()} 회관</span>
                      <span className="font-mono text-indigo-700 text-sm">
                        최종 산정가: {v.finalRent.toLocaleString()} 원/㎡/월
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-600 pt-1 border-t border-slate-200/60">
                      <div>권역계수: {v.appliedFactors.zone.toFixed(3)}</div>
                      <div>규모계수: {v.appliedFactors.size.toFixed(3)}</div>
                      <div>연식계수: {v.appliedFactors.age.toFixed(3)}</div>
                    </div>

                    <p className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200">
                      <span className="font-bold text-slate-700">조정 사유:</span> {v.adjustmentReason}
                    </p>

                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>확정자: {v.confirmedBy}</span>
                      <span>확정일시: {new Date(v.confirmedAt).toLocaleString("ko-KR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
