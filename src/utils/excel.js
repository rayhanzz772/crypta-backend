/**
 * Vault Export — XLSX Generator
 *
 * Generates a professionally styled Excel workbook for vault password exports.
 * Uses ExcelJS for full formatting support (colors, borders, column widths, etc).
 */

const ExcelJS = require('exceljs')

// ─── Color Palette ───────────────────────────────────────────
const COLORS = {
  headerBg: '1A1A2E',      // deep navy
  headerFont: 'FFFFFF',     // white
  metaBg: '16213E',         // dark blue
  metaFont: 'E2E8F0',      // light gray
  warningBg: 'FEF3C7',     // amber-100
  warningFont: '92400E',   // amber-800
  oddRowBg: 'F8FAFC',      // slate-50
  evenRowBg: 'FFFFFF',     // white
  borderColor: 'CBD5E1',   // slate-300
  accentGreen: '10B981',   // emerald-500
}

// ─── Shared Styles ───────────────────────────────────────────
const thinBorder = {
  top: { style: 'thin', color: { argb: COLORS.borderColor } },
  bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
  left: { style: 'thin', color: { argb: COLORS.borderColor } },
  right: { style: 'thin', color: { argb: COLORS.borderColor } }
}

/**
 * Generate a styled XLSX buffer for vault items.
 *
 * @param {Array<Object>} items - Decrypted vault items with keys:
 *   name, username, password, note, category, created_at, updated_at
 * @returns {Promise<Buffer>} - XLSX file buffer ready to send
 */
async function generateVaultXLSX(items) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Crypta - Secure Password Manager'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Vault Export', {
    properties: { defaultRowHeight: 22 },
    views: [{ showGridLines: false }]
  })

  const exportDate = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const totalItems = items.length
  const totalColumns = 7

  // ═══════════════════════════════════════════════════════════
  //  META / HEADER BLOCK (rows 1-7)
  // ═══════════════════════════════════════════════════════════

  const metaLines = [
    '🔐  CRYPTA — Secure Password Manager',
    '',
    `Export Date     :  ${exportDate} UTC`,
    `Total Items     :  ${totalItems}`,
    '',
    '⚠️  SECURITY NOTICE',
    'This file contains plaintext credentials. Store securely and delete after use.'
  ]

  metaLines.forEach((text, idx) => {
    const row = sheet.addRow([text])
    sheet.mergeCells(idx + 1, 1, idx + 1, totalColumns)

    const isTitle = idx === 0
    const isWarningTitle = idx === 5
    const isWarningBody = idx === 6

    const cell = row.getCell(1)

    if (isTitle) {
      cell.font = { bold: true, size: 16, color: { argb: COLORS.headerFont } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
      row.height = 36
    } else if (isWarningTitle) {
      cell.font = { bold: true, size: 11, color: { argb: COLORS.warningFont } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warningBg } }
    } else if (isWarningBody) {
      cell.font = { italic: true, size: 10, color: { argb: COLORS.warningFont } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warningBg } }
    } else {
      cell.font = { size: 11, color: { argb: COLORS.metaFont } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.metaBg } }
    }

    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  })

  // Spacer row
  sheet.addRow([])

  // ═══════════════════════════════════════════════════════════
  //  COLUMN HEADERS
  // ═══════════════════════════════════════════════════════════

  const headers = ['Name', 'Username', 'Password', 'Note', 'Category', 'Created At', 'Last Updated']

  const headerRow = sheet.addRow(headers)
  headerRow.height = 28

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: COLORS.headerFont } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = thinBorder
  })

  // ═══════════════════════════════════════════════════════════
  //  DATA ROWS
  // ═══════════════════════════════════════════════════════════

  items.forEach((item, idx) => {
    const row = sheet.addRow([
      item.name,
      item.username,
      item.password,
      item.note,
      item.category,
      item.created_at,
      item.updated_at
    ])

    const isOdd = idx % 2 === 0
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isOdd ? COLORS.oddRowBg : COLORS.evenRowBg }
      }
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle', wrapText: colNumber === 4 } // wrap Note column
      cell.font = { size: 10 }
    })
  })

  // ═══════════════════════════════════════════════════════════
  //  FOOTER
  // ═══════════════════════════════════════════════════════════

  sheet.addRow([]) // spacer
  const footerRow = sheet.addRow([`✅ ${totalItems} item(s) exported successfully.`])
  sheet.mergeCells(footerRow.number, 1, footerRow.number, totalColumns)
  const footerCell = footerRow.getCell(1)
  footerCell.font = { italic: true, size: 10, color: { argb: COLORS.accentGreen } }
  footerCell.alignment = { horizontal: 'left', indent: 1 }

  // ═══════════════════════════════════════════════════════════
  //  COLUMN WIDTHS
  // ═══════════════════════════════════════════════════════════

  sheet.columns = [
    { width: 28 }, // Name
    { width: 30 }, // Username
    { width: 32 }, // Password
    { width: 40 }, // Note
    { width: 18 }, // Category
    { width: 14 }, // Created At
    { width: 14 }  // Last Updated
  ]

  // ═══════════════════════════════════════════════════════════
  //  AUTO-FILTER on header row
  // ═══════════════════════════════════════════════════════════

  const headerRowNumber = metaLines.length + 2 // meta rows + spacer + 1
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: totalColumns }
  }

  // Generate buffer
  return workbook.xlsx.writeBuffer()
}

module.exports = {
  generateVaultXLSX
}
