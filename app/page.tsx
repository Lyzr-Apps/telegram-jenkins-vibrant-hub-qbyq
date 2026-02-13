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

interface BuildParam {
  key: string
  value: string
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

const JENKINS_CONFIG_KEY = 'jenkins_deployment_config'

const DEFAULT_JENKINS_CONFIG: JenkinsConfig = {
  serverUrl: '',
  jobPath: '',
  username: '',
  apiToken: '',
  authMethod: 'token',
}

function loadJenkinsConfig(): JenkinsConfig {
  if (typeof window === 'undefined') return DEFAULT_JENKINS_CONFIG
  try {
    const stored = localStorage.getItem(JENKINS_CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_JENKINS_CONFIG, ...parsed }
    }
  } catch {}
  return DEFAULT_JENKINS_CONFIG
}

function saveJenkinsConfig(config: JenkinsConfig) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(JENKINS_CONFIG_KEY, JSON.stringify(config))
  } catch {}
}

function isJenkinsConfigured(config: JenkinsConfig): boolean {
  return !!(config.serverUrl.trim() && config.jobPath.trim() && config.username.trim() && config.apiToken.trim())
}

interface QuickTemplate {
  name: string
  description: string
  environment: string
  branch: string
  icon: React.ReactNode
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
      environment: 'staging',
      branch: 'main',
      build_parameters: { SKIP_TESTS: 'false', VERBOSE: 'true' },
      build_url: 'https://jenkins.example.com/job/deploy/42',
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
      logs_summary: 'All stages completed successfully. Application deployed to staging environment. Health checks passed.',
      error_message: '',
      message: 'Deployment to staging completed successfully in 4m 30s. Build #42 is live.',
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
      build_parameters: { CANARY: 'true' },
      build_url: 'https://jenkins.example.com/job/deploy/41',
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
      build_parameters: { DEBUG: 'true' },
      build_url: 'https://jenkins.example.com/job/deploy/40',
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
                <span className="text-foreground font-medium">{val}</span>
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
// MAIN PAGE
// ============================================================================

export default function Page() {
  // Form State
  const [commitHash, setCommitHash] = useState('')
  const [environment, setEnvironment] = useState('staging')
  const [branch, setBranch] = useState('main')
  const [buildParams, setBuildParams] = useState<BuildParam[]>([])

  // Agent State
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
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

  // Load Jenkins config from localStorage on mount
  useEffect(() => {
    setJenkinsConfig(loadJenkinsConfig())
  }, [])

  // Quick Deploy Templates
  const templates: QuickTemplate[] = [
    {
      name: 'Deploy to Staging',
      description: 'Standard deployment to staging environment from main branch',
      environment: 'staging',
      branch: 'main',
      icon: <HiServerStack className="h-5 w-5" />,
    },
    {
      name: 'Deploy to Production',
      description: 'Production deployment from main branch with full pipeline',
      environment: 'production',
      branch: 'main',
      icon: <HiRocketLaunch className="h-5 w-5" />,
    },
    {
      name: 'Hotfix Deploy',
      description: 'Emergency hotfix deployment to production from hotfix branch',
      environment: 'production',
      branch: 'hotfix/',
      icon: <HiBolt className="h-5 w-5" />,
    },
  ]

  // Apply sample data
  useEffect(() => {
    if (showSampleData) {
      setDeploymentHistory(SAMPLE_DEPLOYMENTS)
      setCurrentDeployment(SAMPLE_DEPLOYMENTS[0]?.data ?? null)
      setCommitHash('a3f8b2c4d5e6f7a8')
      setEnvironment('staging')
      setBranch('main')
      setBuildParams([{ key: 'SKIP_TESTS', value: 'false' }, { key: 'VERBOSE', value: 'true' }])
    } else {
      setDeploymentHistory([])
      setCurrentDeployment(null)
      setCommitHash('')
      setEnvironment('staging')
      setBranch('main')
      setBuildParams([])
    }
  }, [showSampleData])

  // Build Param handlers
  const addBuildParam = useCallback(() => {
    setBuildParams(prev => [...prev, { key: '', value: '' }])
  }, [])

  const removeBuildParam = useCallback((index: number) => {
    setBuildParams(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateBuildParam = useCallback((index: number, field: 'key' | 'value', val: string) => {
    setBuildParams(prev => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)))
  }, [])

  // Jenkins config handlers
  const handleSaveConfig = useCallback(() => {
    saveJenkinsConfig(jenkinsConfig)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2500)
  }, [jenkinsConfig])

  const updateConfigField = useCallback((field: keyof JenkinsConfig, value: string) => {
    setJenkinsConfig(prev => ({ ...prev, [field]: value }))
    setConfigSaved(false)
  }, [])

  const handleTestConnection = useCallback(async () => {
    if (!isJenkinsConfigured(jenkinsConfig)) return
    setTestingConnection(true)
    // Simulate a connection test via the agent
    try {
      const testMsg = `/test-connection server:${jenkinsConfig.serverUrl} job:${jenkinsConfig.jobPath} user:${jenkinsConfig.username}`
      await callAIAgent(testMsg, DEPLOYMENT_AGENT_ID)
    } catch {}
    setTestingConnection(false)
  }, [jenkinsConfig])

  // Apply template
  const applyTemplate = useCallback((template: QuickTemplate) => {
    setEnvironment(template.environment)
    setBranch(template.branch)
    setActiveTab('deploy')
  }, [])

  // Deploy handler
  const handleDeploy = useCallback(async () => {
    if (!commitHash.trim()) {
      setErrorMsg('Please enter a commit hash to deploy.')
      return
    }

    if (!isJenkinsConfigured(jenkinsConfig)) {
      setErrorMsg('Jenkins is not configured. Go to the Settings tab to set up your Jenkins server URL, job path, and credentials.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setActiveAgentId(DEPLOYMENT_AGENT_ID)
    setCurrentDeployment(null)

    // Build the message in the expected format
    const paramsStr = buildParams
      .filter(p => p.key.trim() && p.value.trim())
      .map(p => `${p.key.trim()}=${p.value.trim()}`)
      .join(',')

    let message = `/deploy commit:${commitHash.trim()} env:${environment} branch:${branch.trim()}`
    message += ` server:${jenkinsConfig.serverUrl} job:${jenkinsConfig.jobPath} user:${jenkinsConfig.username} auth:${jenkinsConfig.apiToken} auth_method:${jenkinsConfig.authMethod}`
    if (paramsStr) {
      message += ` params:${paramsStr}`
    }

    try {
      const result = await callAIAgent(message, DEPLOYMENT_AGENT_ID)

      if (result?.success) {
        const data = result?.response?.result as DeploymentResult | undefined
        if (data) {
          setCurrentDeployment(data)
          const newEntry: DeploymentHistoryEntry = {
            id: data?.deployment_id ?? `deploy-${Date.now()}`,
            data,
            timestamp: data?.started_at ?? new Date().toISOString(),
          }
          setDeploymentHistory(prev => [newEntry, ...prev])
        } else {
          // Try to extract message from response
          const msg = result?.response?.message ?? 'Deployment request submitted. Response did not include structured data.'
          setErrorMsg(msg)
        }
      } else {
        setErrorMsg(result?.error ?? result?.response?.message ?? 'Deployment request failed. Please try again.')
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please check your connection and try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }, [commitHash, environment, branch, buildParams, jenkinsConfig])

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
                <CardContent className="space-y-5">
                  {/* Commit Hash */}
                  <div className="space-y-2">
                    <Label htmlFor="commit-hash" className="text-sm font-medium flex items-center gap-1.5">
                      <LuGitCommitHorizontal className="h-3.5 w-3.5 text-primary" />
                      Commit Hash
                    </Label>
                    <Input
                      id="commit-hash"
                      placeholder="e.g. a3f8b2c4d5e6f7a8"
                      value={commitHash}
                      onChange={(e) => setCommitHash(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Environment */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <HiServerStack className="h-3.5 w-3.5 text-primary" />
                      Environment
                    </Label>
                    <Select value={environment} onValueChange={setEnvironment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select environment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dev">Development</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="qa">QA</SelectItem>
                        <SelectItem value="uat">UAT</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch */}
                  <div className="space-y-2">
                    <Label htmlFor="branch" className="text-sm font-medium flex items-center gap-1.5">
                      <LuGitBranch className="h-3.5 w-3.5 text-primary" />
                      Branch
                    </Label>
                    <Input
                      id="branch"
                      placeholder="e.g. main"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Build Parameters */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <HiCog6Tooth className="h-3.5 w-3.5 text-primary" />
                        Build Parameters
                      </Label>
                      <Button variant="ghost" size="sm" onClick={addBuildParam} className="h-7 gap-1 text-xs">
                        <HiPlus className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                    {buildParams.length === 0 && (
                      <p className="text-xs text-muted-foreground">No build parameters configured. Click Add to include key-value pairs.</p>
                    )}
                    <div className="space-y-2">
                      {buildParams.map((param, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            placeholder="KEY"
                            value={param.key}
                            onChange={(e) => updateBuildParam(idx, 'key', e.target.value)}
                            className="font-mono text-xs flex-1"
                          />
                          <span className="text-muted-foreground text-xs">=</span>
                          <Input
                            placeholder="value"
                            value={param.value}
                            onChange={(e) => updateBuildParam(idx, 'value', e.target.value)}
                            className="font-mono text-xs flex-1"
                          />
                          <Button variant="ghost" size="sm" onClick={() => removeBuildParam(idx)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive flex-shrink-0">
                            <HiTrash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

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

                  {!loading && !currentDeployment && (
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
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="qa">QA</SelectItem>
                        <SelectItem value="uat">UAT</SelectItem>
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
                  {templates.map((tmpl, idx) => (
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-md text-xs font-mono">
                              <HiServerStack className="h-3 w-3" />
                              {tmpl.environment}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-md text-xs font-mono">
                              <LuGitBranch className="h-3 w-3" />
                              {tmpl.branch}
                            </span>
                          </div>
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ SETTINGS TAB ============ */}
          <TabsContent value="settings" className="space-y-6 mt-6">
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
                    placeholder="https://jenkins.example.com"
                    value={jenkinsConfig.serverUrl}
                    onChange={(e) => updateConfigField('serverUrl', e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">The base URL of your Jenkins server (e.g. https://jenkins.yourcompany.com)</p>
                </div>

                {/* Job Path */}
                <div className="space-y-2">
                  <Label htmlFor="jenkins-job" className="text-sm font-medium flex items-center gap-1.5">
                    <HiCommandLine className="h-3.5 w-3.5 text-primary" />
                    Job Path
                  </Label>
                  <Input
                    id="jenkins-job"
                    placeholder="e.g. my-project/deploy or folder/subfolder/job-name"
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

                {/* Action Buttons */}
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
                        Save Configuration
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
              </CardContent>
            </Card>
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
