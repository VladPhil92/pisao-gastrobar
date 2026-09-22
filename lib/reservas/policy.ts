export const RESERVABLE_TABLE_SEATS = 4;
export const MAX_COMBINED_TABLES = 3;

// Al unir mesas se pierden dos puestos por cada unión:
// 1 mesa = 4, 2 mesas = 6, 3 mesas = 8.
export const MAX_AUTOMATIC_RESERVATION_PEOPLE =
  RESERVABLE_TABLE_SEATS * MAX_COMBINED_TABLES -
  2 * (MAX_COMBINED_TABLES - 1);
