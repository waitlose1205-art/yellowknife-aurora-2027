import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  DEFAULT_MAX_SOURCE_AGE_DAYS,
  EXPECTED_SOURCE_COUNT,
  getSourceAgeDays,
  inspectSourceCoverage,
} from "./pipeline/source-manifest.mjs";
import { compareDatasetQuality } from "./pipeline/quality-gate.mjs";

const root = process.cwd();
const backupDir = join(root, ".daily-update-backup");
const publicDataDir = join(root, "public", "data");
const trackedDataFiles = [
  "tour-products.latest.json",
  "tour-products.latest.csv",
  "source-status.json",
];
const maxHighRisk = Number(process.env.DAILY_MAX_HIGH_RISK ?? "0");
const allowMissingAgency = process.env.DAILY_ALLOW_MISSING_AGENCY === "1";
const maxSourceAgeDays = Number(
  process.env.DAILY_MAX_SOURCE_AGE_DAYS ?? String(DEFAULT_MAX_SOURCE_AGE_DAYS),
);
const maxQualityDropRate = Number(process.env.DAILY_MAX_QUALITY_DROP_RATE ?? "0.05");

function runStep(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function copyDataFiles(fromDir, toDir) {
  mkdirSync(toDir, { recursive: true });

  for (const file of trackedDataFiles) {
    const from = join(fromDir, file);
    if (existsSync(from)) {
      copyFileSync(from, join(toDir, file));
    }
  }
}

function restorePublicData() {
  copyDataFiles(backupDir, publicDataDir);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function getLatestAuditPath() {
  const today = new Date().toISOString().slice(0, 10);
  return join(root, "exports", `tour-data-readiness-audit-${today}.json`);
}

function summarizeSourceStatus() {
  const sourceStatusPath = join(publicDataDir, "source-status.json");
  if (!existsSync(sourceStatusPath)) return [];

  const payload = readJson(sourceStatusPath);
  return payload.sources ?? [];
}

function summarizeAudit() {
  const auditPath = getLatestAuditPath();
  if (!existsSync(auditPath)) {
    throw new Error(`Audit file was not generated: ${auditPath}`);
  }

  const audit = readJson(auditPath);
  return {
    auditPath,
    summary: audit.summary,
    highRows: (audit.rows ?? []).filter((row) => row.issueLevel === "high"),
  };
}

function compareWithPreviousDataset() {
  const previousPath = join(backupDir, "tour-products.latest.json");
  const nextPath = join(publicDataDir, "tour-products.latest.json");
  if (!existsSync(previousPath) || !existsSync(nextPath)) {
    throw new Error("Cannot compare dataset quality because the previous or next dataset is missing");
  }
  return compareDatasetQuality(readJson(previousPath), readJson(nextPath), maxQualityDropRate);
}

function printDailySummary({ auditPath, summary, highRows }, sources, qualityComparison) {
  const missingSources = sources.filter((source) => source.status !== "updated");
  const coverage = inspectSourceCoverage(sources);
  const sourceAgeDays = getSourceAgeDays(summary.sourceCheckedAt);
  const highRisk = summary.byIssueLevel?.high ?? 0;

  console.log(
    JSON.stringify(
      {
        status: "daily-update-check",
        auditFile: basename(auditPath),
        totalProducts: summary.totalProducts,
        issueLevel: summary.byIssueLevel,
        flightStatus: summary.byFlightStatus,
        sourceCount: sources.length,
        expectedSourceCount: EXPECTED_SOURCE_COUNT,
        sourceAgeDays,
        maxSourceAgeDays,
        coverage,
        qualityComparison,
        missingSources: missingSources.map((source) => ({
          agency: source.agency,
          status: source.status,
          totalRows: source.totalRows,
          concreteRows: source.concreteRows,
          nextStep: source.nextStep,
        })),
        highRiskSample: highRows.slice(0, 12).map((row) => ({
          agency: row.agency,
          id: row.id,
          flightStatus: row.flightStatus,
          sourceVerificationStatus: row.sourceVerificationStatus,
          productName: row.productName,
          nextAction: row.nextAction,
        })),
      },
      null,
      2,
    ),
  );

  return { coverage, highRisk, missingSources, sourceAgeDays };
}

copyDataFiles(publicDataDir, backupDir);

try {
  runStep("node", ["scripts/build-tour-data.mjs", "--live-detail-check"]);
  runStep("node", ["scripts/audit-tour-data-readiness.mjs"]);

  const sources = summarizeSourceStatus();
  const audit = summarizeAudit();
  const qualityComparison = compareWithPreviousDataset();
  const { coverage, highRisk, missingSources, sourceAgeDays } = printDailySummary(
    audit,
    sources,
    qualityComparison,
  );

  if (qualityComparison.regressions.length > 0) {
    restorePublicData();
    throw new Error(
      `Daily update rejected: dataset quality regressed in ${qualityComparison.regressions.map(({ metric }) => metric).join(", ")}`,
    );
  }

  if (highRisk > maxHighRisk) {
    restorePublicData();
    throw new Error(`Daily update rejected: high risk rows ${highRisk} exceed limit ${maxHighRisk}`);
  }

  if (
    !allowMissingAgency &&
    (missingSources.length > 0 || coverage.missingAgencies.length > 0)
  ) {
    restorePublicData();
    throw new Error(
      `Daily update rejected: source coverage is incomplete (${coverage.missingAgencies.length} expected agencies missing)`,
    );
  }

  if (sourceAgeDays > maxSourceAgeDays) {
    restorePublicData();
    throw new Error(
      `Daily update rejected: source data is ${sourceAgeDays} days old; limit is ${maxSourceAgeDays}`,
    );
  }

  console.log("Daily update accepted: public data files were refreshed locally.");
} catch (error) {
  restorePublicData();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
