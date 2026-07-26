/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { DatasetMetadata } from "../types/dataset";
import { datasetRepository } from "../db/repository";
import { generateSampleExcelTemplate } from "../services/excelEngine";
import {
  FolderKanban,
  Download,
  Archive,
  RefreshCw,
  Plus,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

export function DatasetManagementView() {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDatasets();
  }, [includeArchived]);

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const list = await datasetRepository.listDatasets(includeArchived);
      setDatasets(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async (datasetId: string) => {
    if (confirm(`[${datasetId}] 데이터셋을 논리 보관(Archive) 처리하시겠습니까?`)) {
      await datasetRepository.archiveDataset(datasetId);
      loadDatasets();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-800">
            분기별 매물 데이터셋 버전 관리 및 형상 보존
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            업로드된 분기 데이터셋의 상태, 버전 이력, 논리 삭제 및 샘플 양식을 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={generateSampleExcelTemplate}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3.5 py-2 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" />
            샘플 Excel 양식 다운로드
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>보관(Archived) 처리된 데이터셋 포함 보기</span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="px-4 py-3.5">데이터셋 ID</th>
                <th className="px-4 py-3.5">기준연도 / 분기 / 버전</th>
                <th className="px-4 py-3.5">파일명 / 해시</th>
                <th className="px-4 py-3.5 text-right">총 행 수 / 정상 행 수</th>
                <th className="px-4 py-3.5 text-center">상태</th>
                <th className="px-4 py-3.5 text-center">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    로딩 중...
                  </td>
                </tr>
              ) : datasets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    저장된 데이터셋이 없습니다.
                  </td>
                </tr>
              ) : (
                datasets.map((ds) => (
                  <tr key={ds.datasetId} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-indigo-700">
                      {ds.datasetId}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      {ds.referenceYear}년 {ds.referenceQuarter}분기 V{ds.version}
                    </td>

                    <td className="px-4 py-3.5 text-slate-600 truncate max-w-xs">
                      <div>{ds.originalFileName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{ds.fileHash.slice(0, 16)}...</div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono">
                      <span className="font-bold text-slate-800">{ds.totalRowCount.toLocaleString()}</span> /{" "}
                      <span className="text-emerald-700 font-bold">{ds.validRowCount.toLocaleString()}</span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                          ds.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-800"
                            : ds.status === "calculated"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ds.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {!ds.isArchived && (
                        <button
                          onClick={() => handleArchive(ds.datasetId)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                          title="보관 처리"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
