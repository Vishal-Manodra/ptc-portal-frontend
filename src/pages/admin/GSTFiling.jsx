// src/pages/admin/GSTFiling.jsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGstFilings } from "../../api";
import Layout from "../../components/layout/Layout";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

const currentFYStart =
  new Date().getMonth() >= 3
    ? new Date().getFullYear()
    : new Date().getFullYear() - 1;

const currentFY = `${currentFYStart}-${currentFYStart + 1}`;
const previousFY = `${currentFYStart - 1}-${currentFYStart}`;

export default function GSTFiling() {
  const [filters, setFilters] = useState({
    financial_year: currentFY,
    month: "All",
    return_type: "",
    status: "",
  });
  const [search, setSearch] = useState("");

  const { data: filings = [], isLoading } = useQuery({
    queryKey: [
      "gstFilings",
      filters.financial_year,
      filters.month,
      filters.return_type,
      filters.status,
    ],
    queryFn: () =>
      getGstFilings({
        financial_year: filters.financial_year,
        month: filters.month,
        return_type: filters.return_type,
        filing_status: filters.status || undefined,
      }),
  });

  const filteredFilings = filings.filter((f) => {
    const matchesSearch =
      !search ||
      f.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.gstin?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <Layout title="GST Return Filing Status">
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 mb-6 w-full">
        {/* Search bar */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search Client or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 shadow-xs"
          />
        </div>

        {/* Filters */}
        <select
          value={filters.financial_year}
          onChange={(e) =>
            setFilters({ ...filters, financial_year: e.target.value })
          }
          className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-750 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-xs flex-shrink-0"
        >
          <option value={currentFY}>
            FY {currentFYStart}-{String(currentFYStart + 1).slice(-2)}
          </option>

          <option value={previousFY}>
            FY {currentFYStart - 1}-{String(currentFYStart).slice(-2)}
          </option>
        </select>

        <select
          value={filters.month}
          onChange={(e) => setFilters({ ...filters, month: e.target.value })}
          className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-755 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-xs flex-shrink-0"
        >
          <option value="All">All Months</option>
          <option value="April">April</option>
          <option value="May">May</option>
          <option value="June">June</option>
          <option value="July">July</option>
          <option value="August">August</option>
          <option value="September">September</option>
          <option value="October">October</option>
          <option value="November">November</option>
          <option value="December">December</option>
          <option value="January">January</option>
          <option value="February">February</option>
          <option value="March">March</option>
        </select>

        <select
          value={filters.return_type}
          onChange={(e) =>
            setFilters({
              ...filters,
              return_type: e.target.value,
            })
          }
          className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-755 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-xs flex-shrink-0"
        >
          <option value="">All Returns</option>
          <option value="gstr1_iff">GSTR1/IFF</option>
          <option value="gstr3b">GSTR3B</option>
          <option value="cmp08">CMP08</option>
          <option value="gstr4">GSTR4</option>
          <option value="gstr4_annual">GSTR4 Annual</option>
          <option value="gstr9_annual">GSTR9 Annual</option>
          <option value="gstr9c">GSTR9C</option>
          <option value="gstr1a">GSTR1A</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-755 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-xs flex-shrink-0"
        >
          <option value="">All Statuses</option>
          <option value="Filed">Filed</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Spinner />
          </div>
        )}

        {filteredFilings.length === 0 && !isLoading ? (
          <EmptyState
            title="No Filing Data Found"
            subtitle="Change your filters or ensure your clients have active GSTINs saved in their profiles."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Business Name</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3">Return Type</th>
                  <th className="px-4 py-3">Financial Year</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Filing Status</th>
                  <th className="px-4 py-3">Filing Date</th>
                  <th className="px-4 py-3">Last Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredFilings.map((f, index) => (
                  <tr
                    key={f.id || index}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">{f.business_name}</td>
                    <td className="px-4 py-3">{f.gstin}</td>
                    <td className="px-4 py-3">{f.return_type}</td>
                    <td className="px-4 py-3">{f.financial_year}</td>
                    <td className="px-4 py-3">{f.month}</td>
                    <td className="px-4 py-3">{f.filing_status}</td>
                    <td className="px-4 py-3">{f.filing_date || "-"}</td>
                    <td className="px-4 py-3">{f.last_check || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
