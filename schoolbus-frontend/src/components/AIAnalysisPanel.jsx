import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

const severityStyles = {
    low:      { bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200',    text: 'text-blue-700',    icon: '🟢' },
    medium:   { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200',  text: 'text-yellow-700',  icon: '🟡' },
    high:     { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200',  text: 'text-orange-700',  icon: '🟠' },
    critical: { bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-300',     text: 'text-red-700',     icon: '🔴' },
    unknown:  { bg: 'bg-gray-50 dark:bg-slate-700/30',    border: 'border-gray-200',    text: 'text-gray-700',    icon: '⚪' },
};

const AIAnalysisPanel = ({ aiAnalysis, aiStatus }) => {
    if (!aiAnalysis && aiStatus !== 'failed') {
        return (
            <div className="rounded-xl border border-purple-200 bg-purple-50/60 dark:bg-purple-900/20 p-3 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin flex-shrink-0" />
                <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                    🤖 AI is analyzing this emergency...
                </span>
            </div>
        );
    }

    if (aiStatus === 'failed' && !aiAnalysis) {
        return (
            <div className="rounded-xl border border-gray-200 bg-gray-50 dark:bg-slate-700/30 p-3 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                    🤖 AI analysis unavailable
                </span>
            </div>
        );
    }

    const sev = aiAnalysis?.severity || 'unknown';
    const style = severityStyles[sev] || severityStyles.unknown;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border-2 ${style.border} ${style.bg} p-4`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-bold text-sm text-gray-800 dark:text-white">
                        AI Analysis
                    </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${style.text} ${style.bg} border ${style.border}`}>
                    {style.icon} {sev}
                </span>
            </div>

            {aiAnalysis?.summary && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                    {aiAnalysis.summary}
                </p>
            )}

            {Array.isArray(aiAnalysis?.suggested_actions) && aiAnalysis.suggested_actions.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Suggested Actions
                    </p>
                    <ul className="space-y-1">
                        {aiAnalysis.suggested_actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                <span>{action}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {aiAnalysis?.parent_message && (
                <div className="rounded-lg bg-white/70 dark:bg-slate-800/50 p-2 border border-white/50 dark:border-slate-700/50">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Draft message for parents
                    </p>
                    <p className="text-xs italic text-gray-700 dark:text-gray-300">
                        "{aiAnalysis.parent_message}"
                    </p>
                </div>
            )}
        </motion.div>
    );
};

export default AIAnalysisPanel;