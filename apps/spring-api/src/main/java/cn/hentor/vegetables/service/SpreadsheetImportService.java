package cn.hentor.vegetables.service;

import cn.hentor.vegetables.common.ApiException;
import cn.hentor.vegetables.dto.MemberImportRow;
import cn.hentor.vegetables.dto.UserPackageImportRow;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SpreadsheetImportService {
  private static final long MAX_IMPORT_FILE_SIZE = 5L * 1024L * 1024L;
  private static final Set<String> SUPPORTED_EXTENSIONS = Set.of(".xlsx", ".xls", ".csv");

  private static final Set<String> PHONE_HEADERS = Set.of(
    "phone",
    "mobile",
    "手机号",
    "手机",
    "联系电话",
    "电话"
  );
  private static final Set<String> NICKNAME_HEADERS = Set.of("nickname", "name", "昵称", "姓名", "会员");
  private static final Set<String> REMARK_HEADERS = Set.of("remark", "备注");
  private static final Set<String> STATUS_HEADERS = Set.of("status", "状态", "服务状态", "套餐状态");
  private static final Set<String> DISABLED_REASON_HEADERS = Set.of(
    "disabledreason",
    "disabled_reason",
    "停用原因",
    "禁用原因"
  );
  private static final Set<String> TEMPLATE_HEADERS = Set.of(
    "template",
    "templatename",
    "packagetemplate",
    "packagename",
    "套餐",
    "套餐名",
    "套餐名称",
    "套餐模板",
    "模板"
  );
  private static final Set<String> TOTAL_TIMES_HEADERS = Set.of("totaltimes", "total", "总次数", "次数");
  private static final Set<String> USED_TIMES_HEADERS = Set.of("usedtimes", "used", "已用次数", "已使用", "已用");
  private static final Set<String> WEIGHT_LIMIT_HEADERS = Set.of(
    "weightlimitjin",
    "weight",
    "单次斤数",
    "每次斤数",
    "蔬菜斤数",
    "斤数"
  );

  public List<MemberImportRow> parseMemberRows(MultipartFile file) {
    List<List<String>> rows = readRows(file);
    if (rows.isEmpty()) {
      return List.of();
    }

    List<String> firstRow = rows.getFirst();
    boolean startsWithHeader = hasHeader(firstRow, PHONE_HEADERS);
    Map<String, Integer> indexes = startsWithHeader
      ? resolveHeaderIndexes(firstRow, Map.of(
        "disabledReason", DISABLED_REASON_HEADERS,
        "nickname", NICKNAME_HEADERS,
        "phone", PHONE_HEADERS,
        "remark", REMARK_HEADERS,
        "status", STATUS_HEADERS
      ))
      : Map.of(
        "disabledReason", 4,
        "nickname", 1,
        "phone", 0,
        "remark", 2,
        "status", 3
      );
    List<List<String>> dataRows = startsWithHeader ? rows.subList(1, rows.size()) : rows;
    int rowNumberOffset = startsWithHeader ? 2 : 1;

    List<MemberImportRow> result = new ArrayList<>();
    for (int index = 0; index < dataRows.size(); index += 1) {
      List<String> cells = dataRows.get(index);
      MemberImportRow row = new MemberImportRow(
        optionalCell(cellAt(cells, indexes.get("disabledReason"))),
        optionalCell(cellAt(cells, indexes.get("nickname"))),
        cellAt(cells, indexes.get("phone")).trim(),
        optionalCell(cellAt(cells, indexes.get("remark"))),
        index + rowNumberOffset,
        normalizeMemberStatus(cellAt(cells, indexes.get("status")))
      );
      if (StringUtils.hasText(row.phone()) || StringUtils.hasText(row.nickname()) || StringUtils.hasText(row.remark())) {
        result.add(row);
      }
    }
    return result;
  }

  public List<UserPackageImportRow> parseUserPackageRows(MultipartFile file) {
    List<List<String>> rows = readRows(file);
    if (rows.isEmpty()) {
      return List.of();
    }

    List<String> firstRow = rows.getFirst();
    boolean startsWithHeader = hasHeader(firstRow, PHONE_HEADERS) && hasHeader(firstRow, TEMPLATE_HEADERS);
    Map<String, Integer> indexes = startsWithHeader
      ? resolveHeaderIndexes(firstRow, Map.of(
        "phone", PHONE_HEADERS,
        "remark", REMARK_HEADERS,
        "status", STATUS_HEADERS,
        "templateName", TEMPLATE_HEADERS,
        "totalTimes", TOTAL_TIMES_HEADERS,
        "usedTimes", USED_TIMES_HEADERS,
        "weightLimitJin", WEIGHT_LIMIT_HEADERS
      ))
      : Map.of(
        "phone", 0,
        "remark", 6,
        "status", 5,
        "templateName", 1,
        "totalTimes", 2,
        "usedTimes", 3,
        "weightLimitJin", 4
      );
    List<List<String>> dataRows = startsWithHeader ? rows.subList(1, rows.size()) : rows;
    int rowNumberOffset = startsWithHeader ? 2 : 1;

    List<UserPackageImportRow> result = new ArrayList<>();
    for (int index = 0; index < dataRows.size(); index += 1) {
      List<String> cells = dataRows.get(index);
      UserPackageImportRow row = new UserPackageImportRow(
        cellAt(cells, indexes.get("phone")).trim(),
        optionalCell(cellAt(cells, indexes.get("remark"))),
        index + rowNumberOffset,
        normalizePackageStatus(cellAt(cells, indexes.get("status"))),
        cellAt(cells, indexes.get("templateName")).trim(),
        integerCell(cellAt(cells, indexes.get("totalTimes"))),
        integerCell(cellAt(cells, indexes.get("usedTimes"))),
        decimalCell(cellAt(cells, indexes.get("weightLimitJin")))
      );
      if (StringUtils.hasText(row.phone()) || StringUtils.hasText(row.templateName()) || StringUtils.hasText(row.remark())) {
        result.add(row);
      }
    }
    return result;
  }

  private List<List<String>> readRows(MultipartFile file) {
    ensureSupportedFile(file);
    String extension = extensionOf(file.getOriginalFilename());
    try {
      List<List<String>> rows = ".csv".equals(extension) ? readCsvRows(file) : readWorkbookRows(file);
      return rows
        .stream()
        .map(row -> row.stream().map(cell -> cell == null ? "" : cell.trim()).toList())
        .filter(row -> row.stream().anyMatch(StringUtils::hasText))
        .toList();
    } catch (IOException exception) {
      throw new ApiException("INVALID_IMPORT_FILE", "导入文件读取失败", HttpStatus.BAD_REQUEST);
    }
  }

  private List<List<String>> readWorkbookRows(MultipartFile file) throws IOException {
    DataFormatter formatter = new DataFormatter();
    try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
      if (workbook.getNumberOfSheets() <= 0) {
        return List.of();
      }
      Sheet sheet = workbook.getSheetAt(0);
      List<List<String>> rows = new ArrayList<>();
      for (Row row : sheet) {
        short lastCellNum = row.getLastCellNum();
        if (lastCellNum < 0) {
          continue;
        }
        List<String> cells = new ArrayList<>();
        for (int index = 0; index < lastCellNum; index += 1) {
          Cell cell = row.getCell(index);
          cells.add(cell == null ? "" : formatter.formatCellValue(cell));
        }
        rows.add(cells);
      }
      return rows;
    }
  }

  private List<List<String>> readCsvRows(MultipartFile file) throws IOException {
    List<List<String>> rows = new ArrayList<>();
    try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        rows.add(parseCsvLine(line));
      }
    }
    return rows;
  }

  private List<String> parseCsvLine(String line) {
    List<String> cells = new ArrayList<>();
    StringBuilder current = new StringBuilder();
    boolean quoted = false;
    for (int index = 0; index < line.length(); index += 1) {
      char character = line.charAt(index);
      if (character == '"') {
        boolean escapedQuote = quoted && index + 1 < line.length() && line.charAt(index + 1) == '"';
        if (escapedQuote) {
          current.append('"');
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character == ',' && !quoted) {
        cells.add(current.toString());
        current.setLength(0);
      } else {
        current.append(character);
      }
    }
    cells.add(current.toString());
    return cells;
  }

  private void ensureSupportedFile(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ApiException("INVALID_PARAMS", "导入文件为空", HttpStatus.BAD_REQUEST);
    }
    String extension = extensionOf(file.getOriginalFilename());
    if (!SUPPORTED_EXTENSIONS.contains(extension)) {
      throw new ApiException("INVALID_IMPORT_FILE", "仅支持 .xlsx、.xls、.csv 文件", HttpStatus.BAD_REQUEST);
    }
    if (file.getSize() > MAX_IMPORT_FILE_SIZE) {
      throw new ApiException("INVALID_IMPORT_FILE", "导入文件不能超过 5MB", HttpStatus.BAD_REQUEST);
    }
  }

  private String extensionOf(String fileName) {
    if (!StringUtils.hasText(fileName)) {
      return "";
    }
    int index = fileName.lastIndexOf(".");
    return index >= 0 ? fileName.substring(index).toLowerCase() : "";
  }

  private boolean hasHeader(List<String> cells, Set<String> candidates) {
    return cells.stream().map(this::normalizeHeader).anyMatch(candidates::contains);
  }

  private Map<String, Integer> resolveHeaderIndexes(
    List<String> headers,
    Map<String, Set<String>> mapping
  ) {
    return mapping
      .entrySet()
      .stream()
      .collect(java.util.stream.Collectors.toMap(
        Map.Entry::getKey,
        entry -> {
          for (int index = 0; index < headers.size(); index += 1) {
            if (entry.getValue().contains(normalizeHeader(headers.get(index)))) {
              return index;
            }
          }
          return -1;
        }
      ));
  }

  private String normalizeHeader(String value) {
    return value == null ? "" : value.trim().replaceAll("\\s+", "").toLowerCase();
  }

  private String cellAt(List<String> cells, Integer index) {
    return index != null && index >= 0 && index < cells.size() ? cells.get(index) : "";
  }

  private String optionalCell(String value) {
    String trimmed = value == null ? "" : value.trim();
    return StringUtils.hasText(trimmed) ? trimmed : null;
  }

  private Integer integerCell(String value) {
    BigDecimal decimal = decimalCell(value);
    return decimal == null ? null : decimal.intValue();
  }

  private BigDecimal decimalCell(String value) {
    String normalized = value == null ? "" : value.trim().replaceAll("[斤次]", "");
    if (!StringUtils.hasText(normalized)) {
      return null;
    }
    try {
      return new BigDecimal(normalized);
    } catch (NumberFormatException exception) {
      return null;
    }
  }

  private String normalizeMemberStatus(String value) {
    String status = value == null ? "" : value.trim().toLowerCase();
    if (!StringUtils.hasText(status)) {
      return null;
    }
    if (Set.of("active", "正常", "启用", "可服务").contains(status)) {
      return "ACTIVE";
    }
    if (Set.of("disabled", "停用", "禁用", "已停用", "不可服务").contains(status)) {
      return "DISABLED";
    }
    return null;
  }

  private String normalizePackageStatus(String value) {
    String status = value == null ? "" : value.trim().toLowerCase();
    if (!StringUtils.hasText(status)) {
      return null;
    }
    if (Set.of("active", "正常", "启用", "可预订", "可用").contains(status)) {
      return "ACTIVE";
    }
    if (Set.of("frozen", "冻结", "已冻结").contains(status)) {
      return "FROZEN";
    }
    if (Set.of("used_up", "usedup", "用完", "已用完").contains(status)) {
      return "USED_UP";
    }
    if (Set.of("expired", "过期", "不可用").contains(status)) {
      return "EXPIRED";
    }
    return null;
  }
}
