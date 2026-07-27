// A transaction row is a flat map of column name -> raw cell value, exactly
// as printed on the statement -- whatever keys and however many of them the
// model returned for a given row.
export type TransactionRow = Record<string, string>;

export interface ExtractionResult {
  columns: string[]; // column headers, in the order first seen
  transactions: TransactionRow[];
}

export type ConvertErrorCode =
  | "NO_FILE"
  | "NOT_A_PDF"
  | "FILE_TOO_LARGE"
  | "CAPACITY"
  | "SERVER_CONFIG"
  | "UNREADABLE"
  | "UNKNOWN";

export interface ConvertErrorBody {
  code: ConvertErrorCode;
  message: string;
}

export interface ConvertSuccessBody {
  result: ExtractionResult;
  modelUsed: string;
}
