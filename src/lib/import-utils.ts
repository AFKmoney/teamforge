/**
 * Data import utilities for parsing CSV/JSON files and validating imported data.
 */

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------

/**
 * Parses a CSV string into an array of objects.
 * Handles: quoted fields, newlines inside quotes, escaped double-quotes ("").
 */
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        } else {
          // End of quoted field
          inQuotes = false
          i++
          continue
        }
      } else {
        currentField += char
        i++
        continue
      }
    }

    // Not in quotes
    if (char === '"') {
      inQuotes = true
      i++
      continue
    }

    if (char === ',') {
      currentRow.push(currentField)
      currentField = ''
      i++
      continue
    }

    if (char === '\r') {
      // Skip carriage return
      i++
      continue
    }

    if (char === '\n') {
      currentRow.push(currentField)
      currentField = ''
      rows.push(currentRow)
      currentRow = []
      i++
      continue
    }

    currentField += char
    i++
  }

  // Handle last field/row (file may not end with newline)
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  if (rows.length === 0) return []

  // First row is headers
  const headers = rows[0].map((h) => h.trim())
  const result: Record<string, string>[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    // Skip empty rows
    if (row.length === 1 && row[0].trim() === '') continue
    const obj: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = c < row.length ? row[c] : ''
    }
    result.push(obj)
  }

  return result
}

// ---------------------------------------------------------------------------
// JSON Parser
// ---------------------------------------------------------------------------

/**
 * Parses a JSON string into an array of objects with validation.
 * Accepts both an array of objects or a single object.
 */
export function parseJSON(text: string): { data: Record<string, unknown>[]; error: string | null } {
  try {
    const parsed = JSON.parse(text)

    if (Array.isArray(parsed)) {
      const data = parsed.filter(
        (item) => item !== null && typeof item === 'object' && !Array.isArray(item)
      ) as Record<string, unknown>[]
      if (data.length === 0) {
        return { data: [], error: 'JSON array contains no valid objects.' }
      }
      return { data, error: null }
    }

    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { data: [parsed as Record<string, unknown>], error: null }
    }

    return { data: [], error: 'JSON must be an object or array of objects.' }
  } catch (e) {
    return { data: [], error: `Invalid JSON: ${(e as Error).message}` }
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean
  errors: string[]
  data: Record<string, unknown>[]
  validCount: number
  invalidCount: number
}

/**
 * Validates imported data has the required fields.
 * Returns valid rows and a list of per-row error messages.
 */
export function validateImportData(
  data: Record<string, unknown>[],
  requiredFields: string[]
): ValidationResult {
  const errors: string[] = []
  const validData: Record<string, unknown>[] = []

  data.forEach((row, idx) => {
    const missingFields = requiredFields.filter(
      (field) =>
        row[field] === undefined ||
        row[field] === null ||
        String(row[field]).trim() === ''
    )
    if (missingFields.length > 0) {
      errors.push(`Row ${idx + 1}: Missing required field(s): ${missingFields.join(', ')}`)
    } else {
      validData.push(row)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    data: validData,
    validCount: validData.length,
    invalidCount: errors.length,
  }
}

// ---------------------------------------------------------------------------
// File Reader
// ---------------------------------------------------------------------------

/**
 * Promise-based file reader utility.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsText(file)
  })
}
