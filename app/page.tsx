'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  HiChevronDown,
  HiChevronUp,
  HiPlus,
  HiTrash,
  HiArrowTopRightOnSquare,
  HiCheckCircle,
  HiXCircle,
  HiExclamationCircle,
  HiRocketLaunch,
  HiCommandLine,
  HiPlay,
  HiFunnel,
  HiBolt,
  HiCog6Tooth,
  HiSignal,
  HiClock,
  HiHashtag,
  HiServerStack,
  HiShieldCheck,
  HiKey,
  HiLink,
  HiEye,
  HiEyeSlash,
  HiWrenchScrewdriver,
  HiInformationCircle,
  HiAdjustmentsHorizontal,
} from 'react-icons/hi2'
import {
  LuGitCommitHorizontal,
  LuGitBranch,
  LuLoaderCircle,
} from 'react-icons/lu'

// ============================================================================
// THEME
// ============================================================================

const THEME_VARS: React.CSSProperties & Record<string, string> = {
  '--background': '35 29% 95%',
  '--foreground': '30 22% 14%',
  '--card': '35 29% 92%',
  '--card-foreground': '30 22% 14%',
  '--popover': '35 29% 90%',
  '--popover-foreground': '30 22% 14%',
  '--primary': '27 61% 26%',
  '--primary-foreground': '35 29% 98%',
  '--secondary': '35 20% 88%',
  '--secondary-foreground': '30 22% 18%',
  '--accent': '43 75% 38%',
  '--accent-foreground': '35 29% 98%',
  '--destructive': '0 84% 60%',
  '--destructive-foreground': '0 0% 98%',
  '--muted': '35 15% 85%',
  '--muted-foreground': '30 20% 45%',
  '--border': '27 61% 26%',
  '--input': '35 15% 75%',
  '--ring': '27 61% 26%',
  '--radius': '0.5rem',
  '--chart-1': '27 61% 26%',
  '--chart-2': '43 75% 38%',
  '--chart-3': '30 55% 25%',
  '--chart-4': '35 45% 42%',
  '--chart-5': '20 65% 35%',
  '--sidebar-background': '35 25% 90%',
  '--sidebar-foreground': '30 22% 14%',
  '--sidebar-border': '35 20% 85%',
  '--sidebar-primary': '27 61% 26%',
  '--sidebar-primary-foreground': '35 29% 98%',
  '--sidebar-accent': '35 20% 85%',
  '--sidebar-accent-foreground': '30 22% 14%',
}

// ============================================================================
// TYPES
// ============================================================================

const DEPLOYMENT_AGENT_ID = '698f5d45445b5e3a53f2c7e3'

interface StageInfo {
  stage_name: string
  status: string
  duration: string
}

interface DeploymentResult {
  deployment_id: string
  status: string
  commit_hash: string
  environment: string
  branch: string
  build_parameters: Record<string, string>
  build_url: string
  started_at: string
  completed_at: string
  duration: string
  build_number: number
  stage_info: StageInfo[]
  logs_summary: string
  error_message: string
  message: string
}

interface DeploymentHistoryEntry {
  id: string
  data: DeploymentResult
  timestamp: string
}

interface JenkinsConfig {
  serverUrl: string
  jobPath: string
  username: string
  apiToken: string
  authMethod: 'token' | 'password'
}

interface JobParameter {
  name: string
  label: string
  type: 'text' | 'select' | 'checkbox' | 'multiselect'
  defaultValue: string
  options: string[]
  description: string
  required: boolean
}

interface QuickTemplate {
  name: string
  description: string
  paramValues: Record<string, string>
  icon: React.ReactNode
}

// ============================================================================
// CONSTANTS & DEFAULTS
// ============================================================================

const JENKINS_CONFIG_KEY = 'jenkins_deployment_config'
const JOB_PARAMS_KEY = 'jenkins_job_parameters'

const DEFAULT_JENKINS_CONFIG: JenkinsConfig = {
  serverUrl: '',
  jobPath: '',
  username: '',
  apiToken: '',
  authMethod: 'token',
}

const DEFAULT_JOB_PARAMS: JobParameter[] = [
  {
    name: 'BRANCH',
    label: 'Branch',
    type: 'text',
    defaultValue: 'main',
    options: [],
    description: 'Git branch to deploy',
    required: true,
  },
  {
    name: 'ENVIRONMENT',
    label: 'Environment',
    type: 'select',
    defaultValue: 'sandbox-preprod',
    options: ['dev', 'sandbox-preprod', 'staging', 'production'],
    description: 'Target deployment environment',
    required: true,
  },
  {
    name: 'SERVICES',
    label: 'Services',
    type: 'multiselect',
    defaultValue: '',
    options: ['frontend', 'backend', 'api-gateway', 'auth-service', 'notification-service'],
    description: 'Select services to deploy',
    required: false,
  },
  {
    name: 'SKIP_TESTS',
    label: 'Skip Tests',
    type: 'checkbox',
    defaultValue: 'false',
    options: [],
    description: 'Skip running test suite before deployment',
    required: false,
  },
  {
    name: 'FORCE_DEPLOY',
    label: 'Force Deploy',
    type: 'checkbox',
    defaultValue: 'false',
    options: [],
    description: 'Force deployment even if checks fail',
    required: false,
  },
  {
    name: 'IMAGE_TAG',
    label: 'Image Tag',
    type: 'text',
    defaultValue: 'latest',
    options: [],
    description: 'Docker image tag to deploy',
    required: false,
  },
]

// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================

function loadJenkinsConfig(): JenkinsConfig {
  if (typeof window === 'undefined') return DEFAULT_JENKINS_CONFIG
  try {
    const stored = localStorage.getItem(JENKINS_CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_JENKINS_CONFIG, ...parsed }
    }
  } catch { /* ignore */ }
  return DEFAULT_JENKINS_CONFIG
}

function saveJenkinsConfig(config: JenkinsConfig) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(JENKINS_CONFIG_KEY, JSON.stringify(config))
  } catch { /* ignore */ }
}

function loadJobParams(): JobParameter[] {
  if (typeof window === 'undefined') return DEFAULT_JOB_PARAMS
  try {
    const stored = localStorage.getItem(JOB_PARAMS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return DEFAULT_JOB_PARAMS
}

function saveJobParams(params: JobParameter[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(JOB_PARAMS_KEY, JSON.stringify(params))
  } catch { /* ignore */ }
}

function isJenkinsConfigured(config: JenkinsConfig): boolean {
  return !!(config.serverUrl.trim() && config.jobPath.trim() && config.username.trim() && config.apiToken.trim())
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const SAMPLE_DEPLOYMENTS: DeploymentHistoryEntry[] = [
  {
    id: '1',
    timestamp: '2026-02-13T10:30:00Z',
    data: {
      deployment_id: 'deploy-1707820200-a3f8b2c',
      status: 'success',
      commit_hash: 'a3f8b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
      environment: 'sandbox-preprod',
      branch: 'main',
      build_parameters: { SKIP_TESTS: 'false', SERVICES: 'frontend,backend', IMAGE_TAG: 'v2.3.1' },
      build_url: 'https://jenkins.sandbox-preprod.senseq.co/job/UI/job/Deployment/job/sandbox-preprod-deploy-ui/42',
      started_at: '2026-02-13T10:30:00Z',
      completed_at: '2026-02-13T10:34:30Z',
      duration: '4m 30s',
      build_number: 42,
      stage_info: [
        { stage_name: 'Checkout', status: 'success', duration: '8s' },
        { stage_name: 'Build', status: 'success', duration: '1m 45s' },
        { stage_name: 'Test', status: 'success', duration: '1m 20s' },
        { stage_name: 'Deploy', status: 'success', duration: '1m 17s' },
      ],
      logs_summary: 'All stages completed successfully. Application deployed to sandbox-preprod environment. Health checks passed.',
      error_message: '',
      message: 'Deployment to sandbox-preprod completed successfully in 4m 30s. Build #42 is live.',
    },
  },
  {
    id: '2',
    timestamp: '2026-02-13T09:15:00Z',
    data: {
      deployment_id: 'deploy-1707815700-b4c9d3e',
      status: 'failed',
      commit_hash: 'b4c9d3e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
      environment: 'production',
      branch: 'release/v2.1',
      build_parameters: { FORCE_DEPLOY: 'true' },
      build_url: 'https://jenkins.sandbox-preprod.senseq.co/job/UI/job/Deployment/job/sandbox-preprod-deploy-ui/41',
      started_at: '2026-02-13T09:15:00Z',
      completed_at: '2026-02-13T09:18:45Z',
      duration: '3m 45s',
      build_number: 41,
      stage_info: [
        { stage_name: 'Checkout', status: 'success', duration: '6s' },
        { stage_name: 'Build', status: 'success', duration: '1m 50s' },
        { stage_name: 'Test', status: 'failed', duration: '1m 49s' },
        { stage_name: 'Deploy', status: 'skipped', duration: '0s' },
      ],
      logs_summary: 'Build failed during Test stage. Integration test suite reported 3 failures.',
      error_message: 'Test failures: UserAuthTest.testTokenRefresh, PaymentTest.testWebhook, APITest.testRateLimit',
      message: 'Deployment to production failed at Test stage. Build #41 has been rolled back.',
    },
  },
  {
    id: '3',
    timestamp: '2026-02-13T08:00:00Z',
    data: {
      deployment_id: 'deploy-1707811200-c5d0e4f',
      status: 'success',
      commit_hash: 'c5d0e4f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
      environment: 'dev',
      branch: 'feature/auth-improvements',
      build_parameters: { SKIP_TESTS: 'true', SERVICES: 'auth-service' },
      build_url: 'https://jenkins.sandbox-preprod.senseq.co/job/UI/job/Deployment/job/sandbox-preprod-deploy-ui/40',
      started_at: '2026-02-13T08:00:00Z',
      completed_at: '2026-02-13T08:02:15Z',
      duration: '2m 15s',
      build_number: 40,
      stage_info: [
        { stage_name: 'Checkout', status: 'success', duration: '5s' },
        { stage_name: 'Build', status: 'success', duration: '1m 10s' },
        { stage_name: 'Deploy', status: 'success', duration: '1m 0s' },
      ],
      logs_summary: 'Fast deployment to dev environment. Tests skipped per configuration.',
      error_message: '',
      message: 'Dev deployment completed in 2m 15s. Build #40 is live on dev.',
    },
  },
]

// ============================================================================
// HELPERS
// ============================================================================

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function getStatusColor(status: string): string {
  const s = (status ?? '').toLowerCase()
  if (s === 'success' || s === 'completed') return 'bg-green-100 text-green-800 border-green-300'
  if (s === 'failed' || s === 'error') return 'bg-red-100 text-red-800 border-red-300'
  if (s === 'building' || s === 'in_progress' || s === 'running') return 'bg-blue-100 text-blue-800 border-blue-300'
  if (s === 'queued' || s === 'pending') return 'bg-amber-100 text-amber-800 border-amber-300'
  if (s === 'cancelled' || s === 'aborted') return 'bg-gray-100 text-gray-600 border-gray-300'
  if (s === 'skipped') return 'bg-gray-50 text-gray-500 border-gray-200'
  return 'bg-secondary text-secondary-foreground border-border'
}

function getStatusIcon(status: string) {
  const s = (status ?? '').toLowerCase()
  if (s === 'success' || s === 'completed') return <HiCheckCircle className="h-4 w-4 text-green-600" />
  if (s === 'failed' || s === 'error') return <HiXCircle className="h-4 w-4 text-red-600" />
  if (s === 'building' || s === 'in_progress' || s === 'running') return <LuLoaderCircle className="h-4 w-4 text-blue-600 animate-spin" />
  if (s === 'queued' || s === 'pending') return <HiClock className="h-4 w-4 text-amber-600" />
  if (s === 'skipped') return <HiExclamationCircle className="h-4 w-4 text-gray-400" />
  return <HiExclamationCircle className="h-4 w-4 text-muted-foreground" />
}

function truncateHash(hash: string): string {
  if (!hash) return ''
  return hash.length > 8 ? hash.slice(0, 8) : hash
}

function formatTimestamp(ts: string): string {
  if (!ts) return '--'
  try {
    const d = new Date(ts)
    return d.toLocaleString()
  } catch {
    return ts
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}>
      {getStatusIcon(status)}
      {(status ?? 'unknown').toUpperCase()}
    </span>
  )
}

function StagePipeline({ stages }: { stages: StageInfo[] }) {
  const safeStages = Array.isArray(stages) ? stages : []
  if (safeStages.length === 0) {
    return <p className="text-sm text-muted-foreground">No stage information available.</p>
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 flex-wrap">
        {safeStages.map((stage, idx) => (
          <React.Fragment key={idx}>
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium ${getStatusColor(stage?.status ?? '')}`}>
              {getStatusIcon(stage?.status ?? '')}
              <span>{stage?.stage_name ?? `Stage ${idx + 1}`}</span>
            </div>
            {idx < safeStages.length - 1 && (
              <div className="w-4 h-0.5 bg-border flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {safeStages.map((stage, idx) => (
          <div key={idx} className="flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-md text-xs">
            <span className="font-medium text-foreground">{stage?.stage_name ?? `Stage ${idx + 1}`}</span>
            <span className="text-muted-foreground">{stage?.duration ?? '--'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeploymentDetailCard({ deployment }: { deployment: DeploymentResult }) {
  if (!deployment) return null
  const buildParams = deployment?.build_parameters ?? {}
  const paramEntries = Object.entries(buildParams)

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HiCommandLine className="h-5 w-5 text-primary" />
            <h3 className="font-serif font-semibold text-lg text-foreground">{deployment?.deployment_id ?? 'Unknown Deployment'}</h3>
          </div>
          {deployment?.message && (
            <p className="text-sm text-muted-foreground mt-1">{deployment.message}</p>
          )}
        </div>
        <StatusBadge status={deployment?.status ?? 'unknown'} />
      </div>

      <Separator />

      {/* Key Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
          <LuGitCommitHorizontal className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Commit Hash</p>
            <p className="text-sm font-mono text-foreground break-all">{deployment?.commit_hash ?? '--'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
          <HiServerStack className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Environment</p>
            <p className="text-sm font-semibold text-foreground uppercase">{deployment?.environment ?? '--'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
          <LuGitBranch className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Branch</p>
            <p className="text-sm font-mono text-foreground">{deployment?.branch ?? '--'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
          <HiHashtag className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Build Number</p>
            <p className="text-sm font-semibold text-foreground">#{deployment?.build_number ?? '--'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
          <HiClock className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Duration</p>
            <p className="text-sm text-foreground">{deployment?.duration ?? '--'}</p>
          </div>
        </div>
        {deployment?.build_url && (
          <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
            <HiArrowTopRightOnSquare className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Build URL</p>
              <a
                href={deployment.build_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline hover:text-primary/80 break-all"
              >
                View in Jenkins
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 bg-secondary/30 rounded-lg">
          <p className="text-xs text-muted-foreground font-medium mb-1">Started At</p>
          <p className="text-sm text-foreground">{formatTimestamp(deployment?.started_at ?? '')}</p>
        </div>
        <div className="p-3 bg-secondary/30 rounded-lg">
          <p className="text-xs text-muted-foreground font-medium mb-1">Completed At</p>
          <p className="text-sm text-foreground">{formatTimestamp(deployment?.completed_at ?? '')}</p>
        </div>
      </div>

      {/* Build Parameters */}
      {paramEntries.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <HiCog6Tooth className="h-4 w-4 text-primary" />
            Build Parameters
          </h4>
          <div className="flex flex-wrap gap-2">
            {paramEntries.map(([key, val], idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary rounded-md text-xs font-mono">
                <span className="text-muted-foreground">{key}=</span>
                <span className="text-foreground font-medium">{String(val)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stage Pipeline */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <HiSignal className="h-4 w-4 text-primary" />
          Pipeline Stages
        </h4>
        <StagePipeline stages={deployment?.stage_info ?? []} />
      </div>

      {/* Logs Summary */}
      {deployment?.logs_summary && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <HiCommandLine className="h-4 w-4 text-primary" />
            Logs Summary
          </h4>
          <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
            {renderMarkdown(deployment.logs_summary)}
          </div>
        </div>
      )}

      {/* Error Message */}
      {deployment?.error_message && (
        <div>
          <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
            <HiXCircle className="h-4 w-4" />
            Error Details
          </h4>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-red-800 text-sm font-mono">
            {deployment.error_message}
          </div>
        </div>
      )}
    </div>
  )
}

function HistoryRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: DeploymentHistoryEntry
  isExpanded: boolean
  onToggle: () => void
}) {
  const data = entry?.data
  if (!data) return null

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden bg-card shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={data?.status ?? 'unknown'} />
          <span className="text-xs font-mono text-muted-foreground">{truncateHash(data?.commit_hash ?? '')}</span>
          <span className="text-xs font-medium text-foreground uppercase">{data?.environment ?? '--'}</span>
          <span className="text-xs text-muted-foreground">{data?.branch ?? '--'}</span>
          <span className="text-xs text-muted-foreground">{formatTimestamp(entry?.timestamp ?? '')}</span>
        </div>
        {isExpanded ? (
          <HiChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <HiChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/40">
          <DeploymentDetailCard deployment={data} />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// JOB PARAMETER EDITOR (Settings Tab)
// ============================================================================

function JobParameterEditor({
  params,
  onUpdate,
}: {
  params: JobParameter[]
  onUpdate: (params: JobParameter[]) => void
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const addParam = useCallback(() => {
    const newParam: JobParameter = {
      name: '',
      label: '',
      type: 'text',
      defaultValue: '',
      options: [],
      description: '',
      required: false,
    }
    onUpdate([...params, newParam])
    setExpandedIdx(params.length)
  }, [params, onUpdate])

  const removeParam = useCallback((idx: number) => {
    const next = params.filter((_, i) => i !== idx)
    onUpdate(next)
    if (expandedIdx === idx) setExpandedIdx(null)
    else if (expandedIdx !== null && expandedIdx > idx) setExpandedIdx(expandedIdx - 1)
  }, [params, onUpdate, expandedIdx])

  const updateParam = useCallback((idx: number, field: keyof JobParameter, value: string | boolean | string[]) => {
    const next = params.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    onUpdate(next)
  }, [params, onUpdate])

  const resetToDefaults = useCallback(() => {
    onUpdate(DEFAULT_JOB_PARAMS)
    setExpandedIdx(null)
  }, [onUpdate])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HiAdjustmentsHorizontal className="h-4 w-4 text-primary" />
            Job Parameters
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">Configure the parameters sent to your Jenkins job when triggering a build.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetToDefaults} className="h-7 text-xs gap-1 text-muted-foreground">
            Reset Defaults
          </Button>
          <Button variant="outline" size="sm" onClick={addParam} className="h-7 gap-1 text-xs">
            <HiPlus className="h-3.5 w-3.5" />
            Add Parameter
          </Button>
        </div>
      </div>

      {params.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No parameters configured. Click &quot;Add Parameter&quot; to define job parameters, or &quot;Reset Defaults&quot; to restore the default set.
        </div>
      )}

      <div className="space-y-2">
        {params.map((param, idx) => {
          const isOpen = expandedIdx === idx
          return (
            <div key={idx} className="border border-border/60 rounded-lg bg-card overflow-hidden">
              <button
                onClick={() => setExpandedIdx(isOpen ? null : idx)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{param.label || param.name || 'Untitled Parameter'}</span>
                  {param.name && (
                    <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">{param.name}</span>
                  )}
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary/60 rounded">{param.type}</span>
                  {param.required && (
                    <span className="text-xs text-amber-700 font-medium">Required</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeParam(idx) }}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <HiTrash className="h-3.5 w-3.5" />
                  </button>
                  {isOpen ? <HiChevronUp className="h-4 w-4 text-muted-foreground" /> : <HiChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-border/40 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Parameter Name (Jenkins key)</Label>
                      <Input
                        placeholder="e.g. BRANCH"
                        value={param.name}
                        onChange={(e) => updateParam(idx, 'name', e.target.value)}
                        className="text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Display Label</Label>
                      <Input
                        placeholder="e.g. Branch"
                        value={param.label}
                        onChange={(e) => updateParam(idx, 'label', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Type</Label>
                      <Select value={param.type} onValueChange={(v) => updateParam(idx, 'type', v)}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="select">Select (Dropdown)</SelectItem>
                          <SelectItem value="multiselect">Multi-Select (Checkboxes)</SelectItem>
                          <SelectItem value="checkbox">Checkbox (Boolean)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Default Value</Label>
                      <Input
                        placeholder={param.type === 'checkbox' ? 'true or false' : 'Default value'}
                        value={param.defaultValue}
                        onChange={(e) => updateParam(idx, 'defaultValue', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {(param.type === 'select' || param.type === 'multiselect') && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Options (comma-separated)</Label>
                      <Input
                        placeholder="e.g. dev, staging, production"
                        value={Array.isArray(param.options) ? param.options.join(', ') : ''}
                        onChange={(e) => {
                          const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          updateParam(idx, 'options', opts)
                        }}
                        className="text-sm font-mono"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Description / Help Text</Label>
                    <Input
                      placeholder="Brief description of this parameter"
                      value={param.description}
                      onChange={(e) => updateParam(idx, 'description', e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={param.required}
                      onCheckedChange={(v) => updateParam(idx, 'required', v)}
                    />
                    <Label className="text-xs font-medium cursor-pointer">Required</Label>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Page() {
  // Job Parameters
  const [jobParams, setJobParams] = useState<JobParameter[]>(DEFAULT_JOB_PARAMS)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})

  // Agent State
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [agentMessage, setAgentMessage] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [currentDeployment, setCurrentDeployment] = useState<DeploymentResult | null>(null)

  // History State
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentHistoryEntry[]>([])
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterEnv, setFilterEnv] = useState('all')

  // Sample Data Toggle
  const [showSampleData, setShowSampleData] = useState(false)

  // Jenkins Config State
  const [jenkinsConfig, setJenkinsConfig] = useState<JenkinsConfig>(DEFAULT_JENKINS_CONFIG)
  const [showToken, setShowToken] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  // Active Tab
  const [activeTab, setActiveTab] = useState('deploy')

  // Load config and params from localStorage on mount
  useEffect(() => {
    setJenkinsConfig(loadJenkinsConfig())
    const storedParams = loadJobParams()
    setJobParams(storedParams)
    // Initialize param values from defaults
    const defaults: Record<string, string> = {}
    storedParams.forEach(p => {
      if (p.defaultValue) defaults[p.name] = p.defaultValue
    })
    setParamValues(defaults)
  }, [])

  // Quick Deploy Templates
  const templates: QuickTemplate[] = [
    {
      name: 'Deploy to Sandbox-Preprod',
      description: 'Standard deployment to sandbox-preprod environment from main branch',
      paramValues: { BRANCH: 'main', ENVIRONMENT: 'sandbox-preprod', SKIP_TESTS: 'false', IMAGE_TAG: 'latest' },
      icon: <HiServerStack className="h-5 w-5" />,
    },
    {
      name: 'Deploy to Production',
      description: 'Production deployment from main branch with full pipeline',
      paramValues: { BRANCH: 'main', ENVIRONMENT: 'production', SKIP_TESTS: 'false', FORCE_DEPLOY: 'false', IMAGE_TAG: 'latest' },
      icon: <HiRocketLaunch className="h-5 w-5" />,
    },
    {
      name: 'Hotfix Deploy',
      description: 'Emergency hotfix deployment to production, skipping tests with force deploy',
      paramValues: { BRANCH: 'hotfix/', ENVIRONMENT: 'production', SKIP_TESTS: 'true', FORCE_DEPLOY: 'true' },
      icon: <HiBolt className="h-5 w-5" />,
    },
  ]

  // Apply sample data
  useEffect(() => {
    if (showSampleData) {
      setDeploymentHistory(SAMPLE_DEPLOYMENTS)
      setCurrentDeployment(SAMPLE_DEPLOYMENTS[0]?.data ?? null)
      setParamValues({
        BRANCH: 'main',
        ENVIRONMENT: 'sandbox-preprod',
        SERVICES: 'frontend,backend',
        SKIP_TESTS: 'false',
        FORCE_DEPLOY: 'false',
        IMAGE_TAG: 'v2.3.1',
      })
    } else {
      setDeploymentHistory([])
      setCurrentDeployment(null)
      setAgentMessage('')
      // Reset to defaults
      const defaults: Record<string, string> = {}
      jobParams.forEach(p => {
        if (p.defaultValue) defaults[p.name] = p.defaultValue
      })
      setParamValues(defaults)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSampleData])

  // Update a single param value
  const updateParamValue = useCallback((name: string, value: string) => {
    setParamValues(prev => ({ ...prev, [name]: value }))
  }, [])

  // Toggle a multiselect option
  const toggleMultiselectOption = useCallback((paramName: string, option: string) => {
    setParamValues(prev => {
      const current = prev[paramName] ?? ''
      const selected = current ? current.split(',').filter(Boolean) : []
      const idx = selected.indexOf(option)
      if (idx >= 0) {
        selected.splice(idx, 1)
      } else {
        selected.push(option)
      }
      return { ...prev, [paramName]: selected.join(',') }
    })
  }, [])

  // Jenkins config handlers
  const handleSaveConfig = useCallback(() => {
    saveJenkinsConfig(jenkinsConfig)
    saveJobParams(jobParams)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2500)
  }, [jenkinsConfig, jobParams])

  const updateConfigField = useCallback((field: keyof JenkinsConfig, value: string) => {
    setJenkinsConfig(prev => ({ ...prev, [field]: value }))
    setConfigSaved(false)
  }, [])

  const handleTestConnection = useCallback(async () => {
    if (!isJenkinsConfigured(jenkinsConfig)) return
    setTestingConnection(true)
    try {
      const testMsg = JSON.stringify({
        action: 'test-connection',
        jenkins: {
          server_url: jenkinsConfig.serverUrl,
          job_path: jenkinsConfig.jobPath,
          username: jenkinsConfig.username,
          auth_token: jenkinsConfig.apiToken,
          auth_method: jenkinsConfig.authMethod,
        },
      })
      await callAIAgent(testMsg, DEPLOYMENT_AGENT_ID)
    } catch { /* ignore */ }
    setTestingConnection(false)
  }, [jenkinsConfig])

  // Apply template
  const applyTemplate = useCallback((template: QuickTemplate) => {
    setParamValues(prev => ({ ...prev, ...template.paramValues }))
    setActiveTab('deploy')
  }, [])

  // Handle job params update from editor
  const handleJobParamsUpdate = useCallback((newParams: JobParameter[]) => {
    setJobParams(newParams)
    setConfigSaved(false)
  }, [])

  // Deploy handler
  const handleDeploy = useCallback(async () => {
    // Validate required params
    const missingRequired = jobParams.filter(p => {
      if (!p.required) return false
      const val = paramValues[p.name] ?? ''
      return !val.trim()
    })
    if (missingRequired.length > 0) {
      setErrorMsg(`Required parameters missing: ${missingRequired.map(p => p.label || p.name).join(', ')}`)
      return
    }

    if (!isJenkinsConfigured(jenkinsConfig)) {
      setErrorMsg('Jenkins is not configured. Go to the Settings tab to set up your Jenkins connection.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setAgentMessage('')
    setActiveAgentId(DEPLOYMENT_AGENT_ID)
    setCurrentDeployment(null)

    // Build structured message
    const paramsObj: Record<string, string> = {}
    jobParams.forEach(p => {
      const val = paramValues[p.name] ?? p.defaultValue
      if (val) paramsObj[p.name] = val
    })

    const message = JSON.stringify({
      action: 'deploy',
      jenkins: {
        server_url: jenkinsConfig.serverUrl,
        job_path: jenkinsConfig.jobPath,
        username: jenkinsConfig.username,
        auth_token: jenkinsConfig.apiToken,
        auth_method: jenkinsConfig.authMethod,
      },
      parameters: paramsObj,
    })

    try {
      const result = await callAIAgent(message, DEPLOYMENT_AGENT_ID)

      if (result?.success) {
        // Try to extract deployment data from various response shapes
        let data: DeploymentResult | null = null

        const r = result?.response?.result
        if (r && typeof r === 'object' && ('deployment_id' in r || 'status' in r)) {
          data = r as DeploymentResult
        }

        if (data) {
          setCurrentDeployment(data)
          const newEntry: DeploymentHistoryEntry = {
            id: data?.deployment_id ?? `deploy-${Date.now()}`,
            data,
            timestamp: data?.started_at ?? new Date().toISOString(),
          }
          setDeploymentHistory(prev => [newEntry, ...prev])
        } else {
          // Show the raw response message even if no structured data
          const msg = result?.response?.message
            ?? result?.response?.result?.text
            ?? result?.response?.result?.message
            ?? 'Deployment request submitted. Waiting for structured response from agent.'

          setCurrentDeployment(null)
          setAgentMessage(typeof msg === 'string' ? msg : JSON.stringify(msg))
        }
      } else {
        setErrorMsg(result?.error ?? result?.response?.message ?? 'Deployment request failed.')
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please check your connection and try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }, [jobParams, paramValues, jenkinsConfig])

  // Filtered history
  const filteredHistory = deploymentHistory.filter(entry => {
    const statusMatch = filterStatus === 'all' || (entry?.data?.status ?? '').toLowerCase() === filterStatus
    const envMatch = filterEnv === 'all' || (entry?.data?.environment ?? '').toLowerCase() === filterEnv
    return statusMatch && envMatch
  })

  return (
    <div style={THEME_VARS} className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary rounded-lg shadow-md">
                <HiRocketLaunch className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-foreground tracking-tight">Jenkins Deployment Bot</h1>
                <p className="text-sm text-muted-foreground mt-0.5" style={{ lineHeight: '1.65', letterSpacing: '0.01em' }}>
                  Trigger and monitor Jenkins builds directly from your browser
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sample-toggle" className="text-sm text-muted-foreground cursor-pointer">
                Sample Data
              </Label>
              <Switch
                id="sample-toggle"
                checked={showSampleData}
                onCheckedChange={setShowSampleData}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
            <TabsTrigger value="deploy" className="gap-1.5">
              <HiPlay className="h-4 w-4" />
              Deploy
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <HiClock className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5">
              <HiBolt className="h-4 w-4" />
              Quick Deploy
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <HiWrenchScrewdriver className="h-4 w-4" />
              Settings
              {!isJenkinsConfigured(jenkinsConfig) && (
                <span className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* ============ DEPLOY TAB ============ */}
          <TabsContent value="deploy" className="space-y-6 mt-6">
            {/* Jenkins Config Warning */}
            {!isJenkinsConfigured(jenkinsConfig) && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <HiExclamationCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Jenkins Not Configured</p>
                  <p className="text-xs text-amber-600 mt-0.5">You need to configure your Jenkins server URL, job path, and credentials before deploying.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                  className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100 flex-shrink-0"
                >
                  <HiWrenchScrewdriver className="h-3.5 w-3.5" />
                  Configure
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Deploy Form */}
              <Card className="lg:col-span-2 shadow-md border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <HiCommandLine className="h-5 w-5 text-primary" />
                    Deployment Request
                  </CardTitle>
                  <CardDescription style={{ lineHeight: '1.65', letterSpacing: '0.01em' }}>
                    Configure and trigger a Jenkins pipeline deployment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[520px] pr-1">
                    <div className="space-y-5">
                      {/* Dynamic Job Parameters */}
                      {jobParams.map((param) => {
                        const val = paramValues[param.name] ?? param.defaultValue ?? ''
                        const safeOptions = Array.isArray(param.options) ? param.options : []

                        // TEXT input
                        if (param.type === 'text') {
                          return (
                            <div key={param.name} className="space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-1.5">
                                {param.name === 'BRANCH' && <LuGitBranch className="h-3.5 w-3.5 text-primary" />}
                                {param.name !== 'BRANCH' && <HiCog6Tooth className="h-3.5 w-3.5 text-primary" />}
                                {param.label || param.name}
                                {param.required && <span className="text-red-500 text-xs ml-0.5">*</span>}
                              </Label>
                              <Input
                                placeholder={param.description || `Enter ${param.label || param.name}`}
                                value={val}
                                onChange={(e) => updateParamValue(param.name, e.target.value)}
                                className="text-sm font-mono"
                              />
                              {param.description && (
                                <p className="text-xs text-muted-foreground">{param.description}</p>
                              )}
                            </div>
                          )
                        }

                        // SELECT dropdown
                        if (param.type === 'select') {
                          return (
                            <div key={param.name} className="space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-1.5">
                                <HiServerStack className="h-3.5 w-3.5 text-primary" />
                                {param.label || param.name}
                                {param.required && <span className="text-red-500 text-xs ml-0.5">*</span>}
                              </Label>
                              <Select value={val} onValueChange={(v) => updateParamValue(param.name, v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder={`Select ${param.label || param.name}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {safeOptions.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {param.description && (
                                <p className="text-xs text-muted-foreground">{param.description}</p>
                              )}
                            </div>
                          )
                        }

                        // MULTISELECT checkboxes
                        if (param.type === 'multiselect') {
                          const selectedValues = val ? val.split(',').filter(Boolean) : []
                          return (
                            <div key={param.name} className="space-y-2">
                              <Label className="text-sm font-medium flex items-center gap-1.5">
                                <HiCog6Tooth className="h-3.5 w-3.5 text-primary" />
                                {param.label || param.name}
                                {param.required && <span className="text-red-500 text-xs ml-0.5">*</span>}
                              </Label>
                              <div className="border border-border/60 rounded-lg p-3 space-y-2 bg-secondary/20">
                                {safeOptions.length === 0 && (
                                  <p className="text-xs text-muted-foreground">No options defined. Add options in Settings.</p>
                                )}
                                {safeOptions.map((opt) => {
                                  const isChecked = selectedValues.includes(opt)
                                  return (
                                    <label key={opt} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleMultiselectOption(param.name, opt)}
                                        className="h-4 w-4 rounded border-border accent-primary"
                                      />
                                      <span className="text-sm text-foreground">{opt}</span>
                                    </label>
                                  )
                                })}
                              </div>
                              {param.description && (
                                <p className="text-xs text-muted-foreground">{param.description}</p>
                              )}
                            </div>
                          )
                        }

                        // CHECKBOX (boolean toggle)
                        if (param.type === 'checkbox') {
                          const isOn = val === 'true'
                          return (
                            <div key={param.name} className="space-y-1.5">
                              <div className="flex items-center justify-between py-1">
                                <div className="space-y-0.5">
                                  <Label className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                                    <HiCog6Tooth className="h-3.5 w-3.5 text-primary" />
                                    {param.label || param.name}
                                  </Label>
                                  {param.description && (
                                    <p className="text-xs text-muted-foreground">{param.description}</p>
                                  )}
                                </div>
                                <Switch
                                  checked={isOn}
                                  onCheckedChange={(v) => updateParamValue(param.name, v ? 'true' : 'false')}
                                />
                              </div>
                            </div>
                          )
                        }

                        return null
                      })}

                      {jobParams.length === 0 && (
                        <div className="text-center py-6">
                          <p className="text-sm text-muted-foreground">No job parameters configured.</p>
                          <p className="text-xs text-muted-foreground mt-1">Go to Settings to add parameters for your Jenkins job.</p>
                        </div>
                      )}

                      <Separator />

                      {/* Error Message */}
                      {errorMsg && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          <HiXCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      {/* Deploy Button */}
                      <Button
                        onClick={handleDeploy}
                        disabled={loading}
                        className="w-full gap-2 font-medium shadow-md"
                        size="lg"
                      >
                        {loading ? (
                          <>
                            <LuLoaderCircle className="h-4 w-4 animate-spin" />
                            Deploying...
                          </>
                        ) : (
                          <>
                            <HiRocketLaunch className="h-4 w-4" />
                            Trigger Deployment
                          </>
                        )}
                      </Button>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Deployment Result */}
              <Card className="lg:col-span-3 shadow-md border-border/50">
                <CardHeader>
                  <CardTitle className="font-serif text-lg flex items-center gap-2">
                    <HiSignal className="h-5 w-5 text-primary" />
                    Deployment Status
                  </CardTitle>
                  <CardDescription style={{ lineHeight: '1.65', letterSpacing: '0.01em' }}>
                    Real-time deployment progress and results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <LuLoaderCircle className="h-10 w-10 animate-spin text-primary" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">Processing Deployment</p>
                        <p className="text-xs text-muted-foreground mt-1">Triggering Jenkins pipeline and monitoring build progress...</p>
                      </div>
                    </div>
                  )}

                  {!loading && !currentDeployment && !agentMessage && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <div className="p-4 bg-secondary/50 rounded-full">
                        <HiCommandLine className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No Active Deployment</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Fill in the deployment form and click Trigger Deployment to start a new build pipeline.
                      </p>
                    </div>
                  )}

                  {/* Agent text message (non-structured response) */}
                  {!loading && !currentDeployment && agentMessage && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <HiInformationCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-800 mb-2">Agent Response</p>
                          <div className="text-sm text-blue-700">
                            {renderMarkdown(agentMessage)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!loading && currentDeployment && (
                    <ScrollArea className="max-h-[600px]">
                      <DeploymentDetailCard deployment={currentDeployment} />
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ HISTORY TAB ============ */}
          <TabsContent value="history" className="space-y-6 mt-6">
            <Card className="shadow-md border-border/50">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-serif text-lg flex items-center gap-2">
                      <HiClock className="h-5 w-5 text-primary" />
                      Deployment History
                    </CardTitle>
                    <CardDescription style={{ lineHeight: '1.65', letterSpacing: '0.01em' }}>
                      Past deployments and their outcomes
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <HiFunnel className="h-3.5 w-3.5 text-muted-foreground" />
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="building">Building</SelectItem>
                          <SelectItem value="queued">Queued</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Select value={filterEnv} onValueChange={setFilterEnv}>
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue placeholder="Environment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Envs</SelectItem>
                        <SelectItem value="dev">Dev</SelectItem>
                        <SelectItem value="sandbox-preprod">Sandbox-Preprod</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <div className="p-4 bg-secondary/50 rounded-full">
                      <HiClock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No Deployments Found</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {deploymentHistory.length === 0
                        ? 'Deploy your first build or enable Sample Data to see example entries.'
                        : 'No deployments match the current filters.'}
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {filteredHistory.map(entry => (
                    <HistoryRow
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedHistoryId === entry.id}
                      onToggle={() => setExpandedHistoryId(prev => prev === entry.id ? null : entry.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ TEMPLATES TAB ============ */}
          <TabsContent value="templates" className="space-y-6 mt-6">
            <Card className="shadow-md border-border/50">
              <CardHeader>
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <HiBolt className="h-5 w-5 text-primary" />
                  Quick Deploy Templates
                </CardTitle>
                <CardDescription style={{ lineHeight: '1.65', letterSpacing: '0.01em' }}>
                  Pre-configured deployment templates for common scenarios. Click a template to pre-fill the deployment form.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((tmpl, idx) => {
                    const tmplEnv = tmpl.paramValues?.ENVIRONMENT ?? ''
                    const tmplBranch = tmpl.paramValues?.BRANCH ?? ''
                    return (
                      <Card
                        key={idx}
                        className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50 border-border/50"
                      >
                        <CardContent className="pt-6">
                          <button
                            onClick={() => applyTemplate(tmpl)}
                            className="w-full text-left space-y-3"
                          >
                            <div className="p-2.5 bg-primary/10 rounded-lg w-fit">
                              {tmpl.icon}
                            </div>
                            <div>
                              <h3 className="font-serif font-semibold text-foreground">{tmpl.name}</h3>
                              <p className="text-xs text-muted-foreground mt-1" style={{ lineHeight: '1.65' }}>
                                {tmpl.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {tmplEnv && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-md text-xs font-mono">
                                  <HiServerStack className="h-3 w-3" />
                                  {tmplEnv}
                                </span>
                              )}
                              {tmplBranch && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-md text-xs font-mono">
                                  <LuGitBranch className="h-3 w-3" />
                                  {tmplBranch}
                                </span>
                              )}
                            </div>
                            {/* Show all param values */}
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(tmpl.paramValues ?? {}).filter(([k]) => k !== 'ENVIRONMENT' && k !== 'BRANCH').map(([k, v]) => (
                                <span key={k} className="text-xs font-mono px-1.5 py-0.5 bg-secondary/60 rounded text-muted-foreground">
                                  {k}={v}
                                </span>
                              ))}
                            </div>
                          </button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ SETTINGS TAB ============ */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            {/* Jenkins Connection Config */}
            <Card className="shadow-md border-border/50">
              <CardHeader>
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <HiWrenchScrewdriver className="h-5 w-5 text-primary" />
                  Jenkins Configuration
                </CardTitle>
                <CardDescription style={{ lineHeight: '1.65', letterSpacing: '0.01em' }}>
                  Configure your Jenkins server connection, job path, and authentication credentials. These settings are stored locally in your browser.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Connection Status */}
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${isJenkinsConfigured(jenkinsConfig) ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isJenkinsConfigured(jenkinsConfig) ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                  <div>
                    <p className={`text-sm font-medium ${isJenkinsConfigured(jenkinsConfig) ? 'text-green-800' : 'text-amber-800'}`}>
                      {isJenkinsConfigured(jenkinsConfig) ? 'Jenkins Configured' : 'Configuration Required'}
                    </p>
                    <p className={`text-xs ${isJenkinsConfigured(jenkinsConfig) ? 'text-green-600' : 'text-amber-600'}`}>
                      {isJenkinsConfigured(jenkinsConfig)
                        ? `Connected to ${jenkinsConfig.serverUrl}`
                        : 'Fill in all required fields below to enable deployments.'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Server URL */}
                <div className="space-y-2">
                  <Label htmlFor="jenkins-url" className="text-sm font-medium flex items-center gap-1.5">
                    <HiLink className="h-3.5 w-3.5 text-primary" />
                    Jenkins Server URL
                  </Label>
                  <Input
                    id="jenkins-url"
                    placeholder="https://jenkins.sandbox-preprod.senseq.co"
                    value={jenkinsConfig.serverUrl}
                    onChange={(e) => updateConfigField('serverUrl', e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">The base URL of your Jenkins server</p>
                </div>

                {/* Job Path */}
                <div className="space-y-2">
                  <Label htmlFor="jenkins-job" className="text-sm font-medium flex items-center gap-1.5">
                    <HiCommandLine className="h-3.5 w-3.5 text-primary" />
                    Job Path
                  </Label>
                  <Input
                    id="jenkins-job"
                    placeholder="e.g. UI/Deployment/sandbox-preprod-deploy-ui"
                    value={jenkinsConfig.jobPath}
                    onChange={(e) => updateConfigField('jobPath', e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">The Jenkins job path to trigger. Use forward slashes for folder structures.</p>
                </div>

                <Separator />

                {/* Auth Section Header */}
                <div className="flex items-center gap-2">
                  <HiShieldCheck className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Authentication</h4>
                </div>

                {/* Auth Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Auth Method</Label>
                  <Select
                    value={jenkinsConfig.authMethod}
                    onValueChange={(val) => updateConfigField('authMethod', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select auth method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="token">API Token (Recommended)</SelectItem>
                      <SelectItem value="password">Password</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="jenkins-user" className="text-sm font-medium flex items-center gap-1.5">
                    <HiKey className="h-3.5 w-3.5 text-primary" />
                    Username
                  </Label>
                  <Input
                    id="jenkins-user"
                    placeholder="your-jenkins-username"
                    value={jenkinsConfig.username}
                    onChange={(e) => updateConfigField('username', e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* API Token / Password */}
                <div className="space-y-2">
                  <Label htmlFor="jenkins-token" className="text-sm font-medium flex items-center gap-1.5">
                    <HiShieldCheck className="h-3.5 w-3.5 text-primary" />
                    {jenkinsConfig.authMethod === 'token' ? 'API Token' : 'Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="jenkins-token"
                      type={showToken ? 'text' : 'password'}
                      placeholder={jenkinsConfig.authMethod === 'token' ? 'Your Jenkins API token' : 'Your Jenkins password'}
                      value={jenkinsConfig.apiToken}
                      onChange={(e) => updateConfigField('apiToken', e.target.value)}
                      className="text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(prev => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showToken ? (
                        <HiEyeSlash className="h-4 w-4" />
                      ) : (
                        <HiEye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {jenkinsConfig.authMethod === 'token' && (
                    <p className="text-xs text-muted-foreground">
                      Generate an API token from Jenkins: User Menu &gt; Configure &gt; API Token &gt; Add new token
                    </p>
                  )}
                </div>

                <Separator />

                {/* Info Box */}
                <div className="flex items-start gap-2.5 p-3 bg-secondary/50 rounded-lg border border-border/40">
                  <HiInformationCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1" style={{ lineHeight: '1.65' }}>
                    <p>Credentials are stored locally in your browser&apos;s localStorage and are never sent to any server other than your configured Jenkins instance.</p>
                    <p>For security, use API tokens instead of passwords. Tokens can be revoked individually without changing your password.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Parameters Config */}
            <Card className="shadow-md border-border/50">
              <CardHeader>
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <HiAdjustmentsHorizontal className="h-5 w-5 text-primary" />
                  Job Parameters Configuration
                </CardTitle>
                <CardDescription style={{ lineHeight: '1.65', letterSpacing: '0.01em' }}>
                  Define the parameters that will be sent to your Jenkins job when triggering a build. These appear as form fields on the Deploy tab.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JobParameterEditor params={jobParams} onUpdate={handleJobParamsUpdate} />
              </CardContent>
            </Card>

            {/* Save Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={handleSaveConfig}
                className="gap-2 font-medium shadow-md"
              >
                {configSaved ? (
                  <>
                    <HiCheckCircle className="h-4 w-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <HiCog6Tooth className="h-4 w-4" />
                    Save All Settings
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={!isJenkinsConfigured(jenkinsConfig) || testingConnection}
                className="gap-2"
              >
                {testingConnection ? (
                  <>
                    <LuLoaderCircle className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <HiSignal className="h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Agent Info Section */}
        <Card className="shadow-sm border-border/40">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${activeAgentId ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                  <span className="text-xs font-medium text-foreground">Deployment Agent</span>
                  <span className="text-xs text-muted-foreground font-mono">{DEPLOYMENT_AGENT_ID}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${isJenkinsConfigured(jenkinsConfig) ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    Jenkins: {isJenkinsConfigured(jenkinsConfig) ? 'Configured' : 'Not configured'}
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {activeAgentId ? 'Processing request...' : 'Ready'}
              </span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
