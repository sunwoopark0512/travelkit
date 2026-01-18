/**
 * OpenCode Governance MCP Tools
 * Eigent용 커스텀 거버넌스 검증 도구
 */

const ALLOWED_SCOPE_PATTERNS = {
  pr9: ['docs/opencode/**', 'docs/governance/**', 'tools/**'],
  pr_android: ['apps/android/**'],
  pr_backend: ['new-backend/**'],
  any: ['**']
};

const REQUIRED_10_HEADERS = [
  '[EVIDENCE] CHECKS_SNAPSHOT (STRICT)',
  '[EVIDENCE] LATEST_RUN_META',
  '[EVIDENCE] DIFF_AFTER (Scope)',
  '[EVIDENCE] ROLE_CONTRACT_LEDGER_RULE_EXCERPT',
  '[EVIDENCE] PROJECT_OVERVIEW_MD',
  '[EVIDENCE] PROJECT_LEDGER_MD',
  '[EVIDENCE] AIRTABLE_SYNC_LOG',
  '[EVIDENCE] STICKY_VERIFY',
  '[EVIDENCE] COMMAND_LOG',
  '[EVIDENCE] FINAL_VERDICT'
];

/**
 * DIFF_AFTER 스코프 검증
 * @param {string[]} files - PR에 포함된 파일 경로 목록
 * @param {string} scopeType - 허용된 스코프 타입 (pr9, pr_android, pr_backend, any)
 * @returns {{valid: boolean, violations: string[], allowed: string[]}}
 */
function validateDiffScope(files, scopeType = 'any') {
  const patterns = ALLOWED_SCOPE_PATTERNS[scopeType] || ALLOWED_SCOPE_PATTERNS.any;
  const violations = [];
  
  for (const file of files) {
    let matched = false;
    for (const pattern of patterns) {
      if (matchGlobPattern(file, pattern)) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      violations.push(file);
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
    allowed: patterns,
    summary: violations.length === 0 
      ? `✅ 모든 ${files.length}개 파일이 허용 스코프 내에 있음`
      : `❌ ${violations.length}/${files.length} 파일이 스코프 위반`
  };
}

/**
 * 10 헤더 완전성 검증
 * @param {string} excerptContent - oracle_excerpt 파일 내용
 * @returns {{valid: boolean, present: string[], missing: string[]}}
 */
function validate10Headers(excerptContent) {
  const present = [];
  const missing = [];
  
  for (const header of REQUIRED_10_HEADERS) {
    if (excerptContent.includes(header)) {
      present.push(header);
    } else {
      missing.push(header);
    }
  }
  
  return {
    valid: missing.length === 0,
    present,
    missing,
    completeness: `${present.length}/${REQUIRED_10_HEADERS.length}`,
    summary: missing.length === 0
      ? '✅ 모든 10개 헤더가 존재함'
      : `❌ 누락된 헤더: ${missing.length}개`
  };
}

/**
 * PASS_NA 판정 처리
 * @param {string} header - 누락된 헤더명
 * @param {string} reason - PASS_NA 사유
 * @param {string} approver - 승인자 ID
 * @returns {{status: string, header: string, reason: string, approver: string, timestamp: string}}
 */
function computePassNa(header, reason, approver) {
  if (!reason || reason.length < 20) {
    return {
      status: 'REJECTED',
      error: 'PASS_NA 사유는 최소 20자 이상이어야 합니다.'
    };
  }
  
  return {
    status: 'PASS_NA',
    header,
    reason,
    approver,
    timestamp: new Date().toISOString(),
    formatted: `${header}: PASS_NA\n  사유: ${reason}\n  승인자: ${approver}`
  };
}

/**
 * Oracle Excerpt 포맷팅
 * @param {Object} evidenceData - 증거 데이터 객체
 * @returns {string} - 포맷된 oracle excerpt 마크다운
 */
function formatOracleExcerpt(evidenceData) {
  const {
    prNumber,
    checksSnapshot,
    latestRunMeta,
    diffAfter,
    roleContractExcerpt,
    projectOverview,
    projectLedger,
    airtableSyncLog,
    stickyVerify,
    commandLog,
    passNaItems = []
  } = evidenceData;
  
  let excerpt = `=== PR #${prNumber} Strict Evidence Bundle (Oracle Excerpt) ===\n\n`;
  
  // 1. CHECKS_SNAPSHOT
  excerpt += formatSection('CHECKS_SNAPSHOT (STRICT)', checksSnapshot);
  
  // 2. LATEST_RUN_META
  excerpt += formatSection('LATEST_RUN_META', latestRunMeta);
  
  // 3. DIFF_AFTER
  excerpt += formatSection('DIFF_AFTER (Scope)', diffAfter);
  
  // 4. ROLE_CONTRACT_LEDGER_RULE_EXCERPT
  excerpt += formatSection('ROLE_CONTRACT_LEDGER_RULE_EXCERPT', roleContractExcerpt);
  
  // 5. PROJECT_OVERVIEW_MD
  excerpt += formatSection('PROJECT_OVERVIEW_MD', projectOverview);
  
  // 6. PROJECT_LEDGER_MD
  excerpt += formatSection('PROJECT_LEDGER_MD', projectLedger);
  
  // 7. AIRTABLE_SYNC_LOG
  excerpt += formatSection('AIRTABLE_SYNC_LOG', airtableSyncLog);
  
  // 8. STICKY_VERIFY
  excerpt += formatSection('STICKY_VERIFY', stickyVerify);
  
  // 9. COMMAND_LOG
  excerpt += formatSection('COMMAND_LOG', commandLog);
  
  // PASS_NA 항목 추가
  if (passNaItems.length > 0) {
    excerpt += `\n--- PASS_NA Records ---\n`;
    for (const item of passNaItems) {
      excerpt += `${item.formatted}\n`;
    }
  }
  
  // 10. FINAL_VERDICT
  const verdict = computeFinalVerdict(evidenceData);
  excerpt += formatSection('FINAL_VERDICT', `Verdict: ${verdict.emoji} ${verdict.status}`);
  
  return excerpt;
}

/**
 * 섹션 포맷팅 헬퍼
 */
function formatSection(title, content) {
  return `--- [EVIDENCE] ${title} ---\n${content}\n\n`;
}

/**
 * 최종 판정 계산
 */
function computeFinalVerdict(evidenceData) {
  const failures = [];
  
  if (!evidenceData.checksSnapshot?.includes('pass') && 
      !evidenceData.checksSnapshot?.includes('No CI')) {
    failures.push('CHECKS_SNAPSHOT');
  }
  
  if (!evidenceData.stickyVerify?.includes('PASS')) {
    failures.push('STICKY_VERIFY');
  }
  
  if (!evidenceData.airtableSyncLog?.includes('DRY_RUN') && 
      !evidenceData.airtableSyncLog?.includes('AIRTABLE_OK')) {
    failures.push('AIRTABLE_SYNC_LOG');
  }
  
  return {
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    emoji: failures.length === 0 ? '✅' : '❌',
    failures
  };
}

/**
 * Glob 패턴 매칭 (간단 구현)
 */
function matchGlobPattern(path, pattern) {
  if (pattern === '**') return true;
  
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\//g, '\\/');
  
  return new RegExp(`^${regexPattern}`).test(path);
}

// MCP 툴 인터페이스 내보내기
module.exports = {
  tools: {
    validate_diff_scope: {
      description: 'DIFF_AFTER 스코프 검증',
      input_schema: {
        files: { type: 'array', items: { type: 'string' } },
        scopeType: { type: 'string', default: 'any' }
      },
      handler: validateDiffScope
    },
    validate_10_headers: {
      description: '10 헤더 완전성 검증',
      input_schema: {
        excerptContent: { type: 'string' }
      },
      handler: validate10Headers
    },
    compute_pass_na: {
      description: 'PASS_NA 판정 처리',
      input_schema: {
        header: { type: 'string' },
        reason: { type: 'string' },
        approver: { type: 'string' }
      },
      handler: computePassNa
    },
    format_oracle_excerpt: {
      description: 'Oracle Excerpt 포맷팅',
      input_schema: {
        evidenceData: { type: 'object' }
      },
      handler: formatOracleExcerpt
    }
  },
  
  // 상수 내보내기
  constants: {
    ALLOWED_SCOPE_PATTERNS,
    REQUIRED_10_HEADERS
  }
};
