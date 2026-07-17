/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportToExcel = async (data: any[], fileName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Contacts");

  if (data.length === 0) {
    alert("No data to export.");
    return;
  }

  worksheet.columns = Object.keys(data[0]).map((key) => ({
    header: key.charAt(0).toUpperCase() + key.slice(1),
    key,
    width: 20,
  }));

  data.forEach((item) => {
    worksheet.addRow(item);
  });

  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};

export const getAcceptByHeaderType = (type: string | null) => {
  switch (type?.toUpperCase()) {
    case "IMAGE":
      return "image/*";
    case "VIDEO":
      return "video/*";
    case "DOCUMENT":
      return ".pdf,.doc,.docx";
    default:
      return "";
  }
};

export const getUploadLabel = (type: string | null) => {
  switch (type?.toUpperCase()) {
    case "IMAGE":
      return "Header Image (Required) *";
    case "VIDEO":
      return "Header Video (Required) *";
    case "DOCUMENT":
      return "Header Document (Required) *";
    default:
      return "Header File (Required) *";
  }
};
