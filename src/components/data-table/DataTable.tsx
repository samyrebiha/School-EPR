import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, ChevronLeft, ArrowUpDown } from 'lucide-react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Skeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  searchPlaceholder = 'بحث في الجدول...',
  searchFields,
  filters,
  actions,
  emptyTitle = 'لا توجد بيانات متاحة',
  emptyDescription = 'لم يتم العثور على سجلات تطابق معايير البحث الحالية.',
  pageSize = 10,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field];
          return val ? String(val).toLowerCase().includes(query) : false;
        });
      }
      return Object.values(item).some((val) =>
        val ? String(val).toLowerCase().includes(query) : false
      );
    });
  }, [data, searchQuery, searchFields]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      const compare = typeof valA === 'string'
        ? valA.localeCompare(String(valB), 'ar')
        : valA > valB ? 1 : -1;

      return sortDirection === 'asc' ? compare : -compare;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="table-container">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="table-toolbar-search-wrap">
          <div className="table-search-box">
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              prefixIcon={<Search size={16} />}
            />
          </div>
          {filters && <div className="table-filters-box">{filters}</div>}
        </div>

        {actions && (
          <div className="table-toolbar-actions">
            {actions}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="table-responsive">
        <table className="saas-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1-5)',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown
                        size={14}
                        style={{
                          opacity: sortKey === col.key ? 1 : 0.4,
                          color: sortKey === col.key ? 'var(--color-primary)' : 'inherit',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <Skeleton height={20} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr key={keyExtractor(item)}>
                  {columns.map((col) => (
                    <td key={col.key} data-label={col.header}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && sortedData.length > 0 && (
        <div className="pagination">
          <div>
            عرض{' '}
            <span className="font-semibold text-primary">
              {(currentPage - 1) * pageSize + 1}
            </span>{' '}
            إلى{' '}
            <span className="font-semibold text-primary">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{' '}
            من إجمالي{' '}
            <span className="font-semibold text-primary">{sortedData.length}</span> سجل
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              rightIcon={<ChevronRight size={14} />}
            >
              السابق
            </Button>
            <span style={{ padding: '0 var(--space-2)', fontWeight: 500 }}>
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              leftIcon={<ChevronLeft size={14} />}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

