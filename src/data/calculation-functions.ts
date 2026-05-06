export type FunctionCategory =
  | "Number"
  | "String"
  | "Date"
  | "Conditional"
  | "Aggregation"

export interface CalcFunction {
  name: string
  category: FunctionCategory
  syntax: string
  /** Template inserted at the cursor when the function is clicked. */
  template: string
  /** Index in `template` where the cursor lands after insertion. */
  cursorOffset: number
  description: string
  examples: string[]
}

export const FUNCTION_CATEGORIES: FunctionCategory[] = [
  "Number",
  "String",
  "Date",
  "Conditional",
  "Aggregation",
]

export const CALC_FUNCTIONS: CalcFunction[] = [
  // -------------------------- NUMBER --------------------------
  {
    name: "SUM",
    category: "Number",
    syntax: "SUM(expression)",
    template: "SUM()",
    cursorOffset: 4,
    description:
      "Returns the sum of all values in the expression. Null values are ignored.",
    examples: ["SUM([Outstanding Amount])", "SUM([Total Amount])"],
  },
  {
    name: "AVG",
    category: "Number",
    syntax: "AVG(expression)",
    template: "AVG()",
    cursorOffset: 4,
    description: "Returns the average of all values in the expression.",
    examples: ["AVG([EMI])", "AVG([DPD])"],
  },
  {
    name: "MIN",
    category: "Number",
    syntax: "MIN(expression)",
    template: "MIN()",
    cursorOffset: 4,
    description: "Returns the minimum value in the expression.",
    examples: ["MIN([Last Payment Amount])", "MIN([DPD])"],
  },
  {
    name: "MAX",
    category: "Number",
    syntax: "MAX(expression)",
    template: "MAX()",
    cursorOffset: 4,
    description: "Returns the maximum value in the expression.",
    examples: ["MAX([Outstanding Amount])", "MAX([DPD])"],
  },
  {
    name: "COUNT",
    category: "Number",
    syntax: "COUNT(expression)",
    template: "COUNT()",
    cursorOffset: 6,
    description: "Returns the number of items in the expression.",
    examples: ["COUNT([Total AI Calls])"],
  },
  {
    name: "COUNTD",
    category: "Number",
    syntax: "COUNTD(expression)",
    template: "COUNTD()",
    cursorOffset: 7,
    description: "Returns the number of distinct items in the expression.",
    examples: ["COUNTD([Lender])"],
  },
  {
    name: "ROUND",
    category: "Number",
    syntax: "ROUND(number, places)",
    template: "ROUND(, 2)",
    cursorOffset: 6,
    description: "Rounds a number to the specified number of decimal places.",
    examples: ["ROUND([Outstanding Amount], 2)", "ROUND([Utilization Rate], 0)"],
  },
  {
    name: "FLOOR",
    category: "Number",
    syntax: "FLOOR(number)",
    template: "FLOOR()",
    cursorOffset: 6,
    description: "Rounds a number down to the nearest integer.",
    examples: ["FLOOR([EMI])"],
  },
  {
    name: "CEILING",
    category: "Number",
    syntax: "CEILING(number)",
    template: "CEILING()",
    cursorOffset: 8,
    description: "Rounds a number up to the nearest integer.",
    examples: ["CEILING([Outstanding Amount] / 100)"],
  },
  {
    name: "ABS",
    category: "Number",
    syntax: "ABS(number)",
    template: "ABS()",
    cursorOffset: 4,
    description: "Returns the absolute value of a number.",
    examples: ["ABS([Overdue Amount] - [EMI])"],
  },
  {
    name: "POWER",
    category: "Number",
    syntax: "POWER(number, exponent)",
    template: "POWER(, 2)",
    cursorOffset: 6,
    description: "Raises a number to the specified exponent.",
    examples: ["POWER([DPD], 2)"],
  },
  {
    name: "SQRT",
    category: "Number",
    syntax: "SQRT(number)",
    template: "SQRT()",
    cursorOffset: 5,
    description: "Returns the square root of a number.",
    examples: ["SQRT([Outstanding Amount])"],
  },

  // -------------------------- STRING --------------------------
  {
    name: "CONTAINS",
    category: "String",
    syntax: "CONTAINS(string, substring)",
    template: 'CONTAINS(, "")',
    cursorOffset: 9,
    description:
      "Returns true if the substring appears anywhere inside the string.",
    examples: ['CONTAINS([Name], "Mohammed")'],
  },
  {
    name: "STARTSWITH",
    category: "String",
    syntax: "STARTSWITH(string, substring)",
    template: 'STARTSWITH(, "")',
    cursorOffset: 11,
    description: "Returns true if the string starts with the given substring.",
    examples: ['STARTSWITH([Phone], "+971")'],
  },
  {
    name: "ENDSWITH",
    category: "String",
    syntax: "ENDSWITH(string, substring)",
    template: 'ENDSWITH(, "")',
    cursorOffset: 9,
    description: "Returns true if the string ends with the given substring.",
    examples: ['ENDSWITH([Email], "@gmail.com")'],
  },
  {
    name: "UPPER",
    category: "String",
    syntax: "UPPER(string)",
    template: "UPPER()",
    cursorOffset: 6,
    description: "Converts the string to uppercase.",
    examples: ["UPPER([Name])"],
  },
  {
    name: "LOWER",
    category: "String",
    syntax: "LOWER(string)",
    template: "LOWER()",
    cursorOffset: 6,
    description: "Converts the string to lowercase.",
    examples: ["LOWER([Email])"],
  },
  {
    name: "TRIM",
    category: "String",
    syntax: "TRIM(string)",
    template: "TRIM()",
    cursorOffset: 5,
    description: "Removes leading and trailing whitespace from the string.",
    examples: ["TRIM([Name])"],
  },
  {
    name: "LEN",
    category: "String",
    syntax: "LEN(string)",
    template: "LEN()",
    cursorOffset: 4,
    description: "Returns the number of characters in the string.",
    examples: ["LEN([Phone])"],
  },
  {
    name: "LEFT",
    category: "String",
    syntax: "LEFT(string, num)",
    template: "LEFT(, 3)",
    cursorOffset: 5,
    description: "Returns the leftmost num characters of the string.",
    examples: ["LEFT([Phone], 4)"],
  },
  {
    name: "RIGHT",
    category: "String",
    syntax: "RIGHT(string, num)",
    template: "RIGHT(, 4)",
    cursorOffset: 6,
    description: "Returns the rightmost num characters of the string.",
    examples: ["RIGHT([Emirates ID], 4)"],
  },
  {
    name: "MID",
    category: "String",
    syntax: "MID(string, start, length)",
    template: "MID(, 1, 3)",
    cursorOffset: 4,
    description:
      "Returns a substring starting at position `start` with the given length.",
    examples: ["MID([Emirates ID], 1, 3)"],
  },
  {
    name: "REPLACE",
    category: "String",
    syntax: "REPLACE(string, find, replace)",
    template: 'REPLACE(, "", "")',
    cursorOffset: 8,
    description:
      "Returns the string with all occurrences of `find` replaced by `replace`.",
    examples: ['REPLACE([Phone], " ", "")'],
  },
  {
    name: "SPLIT",
    category: "String",
    syntax: "SPLIT(string, delimiter, index)",
    template: 'SPLIT(, ",", 1)',
    cursorOffset: 6,
    description: "Splits the string by delimiter and returns the token at index.",
    examples: ['SPLIT([Name], " ", 1)'],
  },

  // -------------------------- DATE --------------------------
  {
    name: "TODAY",
    category: "Date",
    syntax: "TODAY()",
    template: "TODAY()",
    cursorOffset: 7,
    description: "Returns the current date.",
    examples: ["TODAY()", "DATEDIFF('day', [Last Payment Date], TODAY())"],
  },
  {
    name: "NOW",
    category: "Date",
    syntax: "NOW()",
    template: "NOW()",
    cursorOffset: 5,
    description: "Returns the current date and time.",
    examples: ["NOW()"],
  },
  {
    name: "DATEADD",
    category: "Date",
    syntax: "DATEADD(part, interval, date)",
    template: "DATEADD('day', 1, )",
    cursorOffset: 18,
    description:
      "Adds the specified interval (number) to the given date. Part can be 'day', 'month', or 'year'.",
    examples: ["DATEADD('day', 30, [Last Payment Date])"],
  },
  {
    name: "DATEDIFF",
    category: "Date",
    syntax: "DATEDIFF(part, date1, date2)",
    template: "DATEDIFF('day', , )",
    cursorOffset: 16,
    description:
      "Returns the difference between two dates as an integer. Part can be 'day', 'month', or 'year'.",
    examples: [
      "DATEDIFF('day', [Last Payment Date], TODAY())",
      "DATEDIFF('month', [Submit Date], TODAY())",
    ],
  },
  {
    name: "YEAR",
    category: "Date",
    syntax: "YEAR(date)",
    template: "YEAR()",
    cursorOffset: 5,
    description: "Returns the four-digit year of a date.",
    examples: ["YEAR([Submit Date])"],
  },
  {
    name: "MONTH",
    category: "Date",
    syntax: "MONTH(date)",
    template: "MONTH()",
    cursorOffset: 6,
    description: "Returns the month (1-12) of a date.",
    examples: ["MONTH([Submit Date])"],
  },
  {
    name: "DAY",
    category: "Date",
    syntax: "DAY(date)",
    template: "DAY()",
    cursorOffset: 4,
    description: "Returns the day of the month (1-31) of a date.",
    examples: ["DAY([Last Payment Date])"],
  },
  {
    name: "WEEK",
    category: "Date",
    syntax: "WEEK(date)",
    template: "WEEK()",
    cursorOffset: 5,
    description: "Returns the ISO week number (1-53) of a date.",
    examples: ["WEEK([Submit Date])"],
  },
  {
    name: "DATEPARSE",
    category: "Date",
    syntax: "DATEPARSE(format, string)",
    template: 'DATEPARSE("yyyy-MM-dd", )',
    cursorOffset: 24,
    description: "Parses a string into a date using the given format.",
    examples: ['DATEPARSE("yyyy-MM-dd", [Submit Date])'],
  },
  {
    name: "DATETRUNC",
    category: "Date",
    syntax: "DATETRUNC(part, date)",
    template: "DATETRUNC('month', )",
    cursorOffset: 19,
    description:
      "Truncates a date to the given precision. Part can be 'day', 'month', or 'year'.",
    examples: ["DATETRUNC('month', [Submit Date])"],
  },

  // -------------------------- CONDITIONAL --------------------------
  {
    name: "IF",
    category: "Conditional",
    syntax: "IF(test, then, else)",
    template: "IF(, , )",
    cursorOffset: 3,
    description:
      "Returns `then` when the test is true, otherwise returns `else`.",
    examples: ['IF([DPD] > 90, "High Risk", "Low Risk")'],
  },
  {
    name: "IF (chained)",
    category: "Conditional",
    syntax: "IF(test, then, elseif_test, then, else)",
    template: "IF(, , , , )",
    cursorOffset: 3,
    description:
      "Chained IF: evaluates the second condition only when the first one is false.",
    examples: [
      'IF([DPD] > 90, "High", [DPD] > 30, "Medium", "Low")',
    ],
  },
  {
    name: "CASE",
    category: "Conditional",
    syntax: "CASE(expression, value1, return1, value2, return2, default)",
    template: "CASE(, , , , , )",
    cursorOffset: 5,
    description:
      "Compares the expression to a list of values and returns the matching result.",
    examples: [
      'CASE([Bucket], "Current", "On Track", "1-30", "Watch", "At Risk")',
    ],
  },
  {
    name: "IIF",
    category: "Conditional",
    syntax: "IIF(test, then, else)",
    template: "IIF(, , )",
    cursorOffset: 4,
    description:
      "Inline IF — returns `then` if the test is true, otherwise returns `else`.",
    examples: ['IIF([Disputed], "Yes", "No")'],
  },
  {
    name: "IFNULL",
    category: "Conditional",
    syntax: "IFNULL(expression, replacement)",
    template: "IFNULL(, )",
    cursorOffset: 7,
    description:
      "Returns the expression if it is not null, otherwise returns the replacement.",
    examples: ["IFNULL([Last Payment Amount], 0)"],
  },
  {
    name: "ISNULL",
    category: "Conditional",
    syntax: "ISNULL(expression)",
    template: "ISNULL()",
    cursorOffset: 7,
    description: "Returns true if the expression is null.",
    examples: ["ISNULL([Last Payment Date])"],
  },

  // -------------------------- AGGREGATION --------------------------
  {
    name: "WINDOW_SUM",
    category: "Aggregation",
    syntax: "WINDOW_SUM(expression)",
    template: "WINDOW_SUM()",
    cursorOffset: 11,
    description:
      "Returns the sum of the expression within the current window of rows.",
    examples: ["WINDOW_SUM(SUM([Outstanding Amount]))"],
  },
  {
    name: "WINDOW_AVG",
    category: "Aggregation",
    syntax: "WINDOW_AVG(expression)",
    template: "WINDOW_AVG()",
    cursorOffset: 11,
    description:
      "Returns the average of the expression within the current window of rows.",
    examples: ["WINDOW_AVG(AVG([DPD]))"],
  },
  {
    name: "RUNNING_SUM",
    category: "Aggregation",
    syntax: "RUNNING_SUM(expression)",
    template: "RUNNING_SUM()",
    cursorOffset: 12,
    description: "Returns the running total of the expression.",
    examples: ["RUNNING_SUM(SUM([Amount Paid]))"],
  },
  {
    name: "INDEX",
    category: "Aggregation",
    syntax: "INDEX()",
    template: "INDEX()",
    cursorOffset: 7,
    description:
      "Returns the index of the current row in the partition (1-based).",
    examples: ["INDEX()"],
  },
  {
    name: "RANK",
    category: "Aggregation",
    syntax: "RANK(expression)",
    template: "RANK()",
    cursorOffset: 5,
    description: "Returns the standard competition rank for the current row.",
    examples: ["RANK(SUM([Outstanding Amount]))"],
  },
  {
    name: "FIRST",
    category: "Aggregation",
    syntax: "FIRST()",
    template: "FIRST()",
    cursorOffset: 7,
    description:
      "Returns the offset of the current row from the first row in the partition.",
    examples: ["FIRST()"],
  },
  {
    name: "LAST",
    category: "Aggregation",
    syntax: "LAST()",
    template: "LAST()",
    cursorOffset: 6,
    description:
      "Returns the offset of the current row from the last row in the partition.",
    examples: ["LAST()"],
  },
]

/**
 * Built-in example calculations users can start from.
 */
export interface CalculationExample {
  name: string
  description: string
  formula: string
}

export const EXAMPLE_CALCULATIONS: CalculationExample[] = [
  {
    name: "Utilization Rate",
    description: "Outstanding balance as a percentage of credit limit.",
    formula: "[Outstanding Amount] / [Credit Limit] * 100",
  },
  {
    name: "Days Since Last Payment",
    description: "Number of days between today and the borrower's last payment.",
    formula: "DATEDIFF('day', [Last Payment Date], TODAY())",
  },
  {
    name: "PTP Kept Rate",
    description: "Percentage of promises to pay that were kept.",
    formula: "([Total PTP] - [Broken Promise Count]) / [Total PTP] * 100",
  },
  {
    name: "Recovery Rate",
    description: "Amount paid as a percentage of the total amount owed.",
    formula: "[Amount Paid] / [Total Amount] * 100",
  },
  {
    name: "AI Contact Rate",
    description: "Percentage of attempted AI calls that were answered.",
    formula: "[AI Calls Answered] / [AI Calls Attempt] * 100",
  },
  {
    name: "Days to Visa Expiry",
    description: "Days remaining until the borrower's visa expires.",
    formula: "DATEDIFF('day', TODAY(), [Visa Expiry Date])",
  },
]
