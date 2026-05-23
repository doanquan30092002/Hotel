export type CategoryGroup =
  | 'ROOM_TYPE'
  | 'ROOM_AREA'
  | 'ROOM_STATUS'
  | 'CLEANING_STATUS'
  | 'PRICE_TYPE'
  | 'PAYMENT_METHOD'
  | 'BOOKING_SOURCE'
  | 'BOOKING_STATUS'
  | 'HOUSEKEEPING_TASK_STATUS'
  | 'FINANCE_GROUP'
  | 'GUEST_SOURCE'
  | 'UNIT'
  | 'SERVICE_GROUP'
  | 'SURCHARGE_TYPE'
  | 'STAFF_POSITION'
  | 'PAYROLL_STATUS';

export const CATEGORY_GROUP_LABEL: Record<CategoryGroup, string> = {
  ROOM_TYPE: 'Loại phòng',
  ROOM_AREA: 'Khu vực phòng',
  ROOM_STATUS: 'Trạng thái phòng',
  CLEANING_STATUS: 'Trạng thái dọn dẹp',
  PRICE_TYPE: 'Loại giá áp dụng',
  PAYMENT_METHOD: 'Phương thức thanh toán',
  BOOKING_SOURCE: 'Nguồn booking',
  BOOKING_STATUS: 'Trạng thái booking',
  HOUSEKEEPING_TASK_STATUS: 'Trạng thái công việc dọn phòng',
  FINANCE_GROUP: 'Nhóm thu chi',
  GUEST_SOURCE: 'Loại khách hàng',
  UNIT: 'Đơn vị',
  SERVICE_GROUP: 'Nhóm dịch vụ',
  SURCHARGE_TYPE: 'Loại phụ thu',
  STAFF_POSITION: 'Chức vụ nhân sự',
  PAYROLL_STATUS: 'Trạng thái bảng lương',
};

export const CATEGORY_GROUPS = Object.keys(CATEGORY_GROUP_LABEL) as CategoryGroup[];

export type Category = {
  id: string;
  group: CategoryGroup;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
  meta?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type GroupCount = {
  group: CategoryGroup;
  total: number;
  active: number;
};
