import type { AdminBrandFilter } from "@/lib/admin/brand-filter"

/** Keep the staff brand lens consistent when moving between admin surfaces. */
export function persistAdminBrandFilter(value: AdminBrandFilter) {
  document.cookie = `admin_brand_filter=${value}; Path=/admin; Max-Age=31536000; SameSite=Lax`
}
