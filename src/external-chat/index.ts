import { bundle } from '../generated/external-chat.js';
import { createRenderer } from '../render/engine.js';
import { articleDraft, type ArticleDraftVars } from '../schemas/articles/draft.js';
import { editorialAnalysis, type EditorialAnalysisVars } from '../schemas/articles/editorial-analysis.js';
import { candidateResearch, type CandidateResearchVars } from '../schemas/ballot/candidate-research.js';
import { candidateRoster, type CandidateRosterVars } from '../schemas/ballot/candidate-roster.js';
import { contestResearch, type ContestResearchVars } from '../schemas/ballot/contest-research.js';
import { questionResearch, type QuestionResearchVars } from '../schemas/ballot/question-research.js';
import { civicLevelResearch, type CivicLevelResearchVars } from '../schemas/vision/civic-level-research.js';
import { importFromSource, type ImportFromSourceVars } from '../schemas/vision/import-from-source.js';
import { learningWithAi, type LearningWithAiVars } from '../schemas/vision/learning-with-ai.js';
import { research, type ResearchVars } from '../schemas/vision/research.js';

export const externalChatPrompts = {
  'articles.draft': articleDraft,
  'articles.editorial-analysis': editorialAnalysis,
  'ballot.candidate-research': candidateResearch,
  'ballot.candidate-roster': candidateRoster,
  'ballot.contest-research': contestResearch,
  'ballot.question-research': questionResearch,
  'vision.civic-level-research': civicLevelResearch,
  'vision.import-from-source': importFromSource,
  'vision.learning-with-ai': learningWithAi,
  'vision.research': research,
};

export type ExternalChatPromptId = keyof typeof externalChatPrompts;

const renderer = createRenderer(externalChatPrompts, bundle);

/** Renders any external-chat prompt by id. Throws `PromptVariablesError` when variables are invalid. */
export const renderPrompt = renderer.render;
/** Checks variables without rendering. */
export const validatePromptVars = renderer.validate;
export const externalChatPromptIds = renderer.ids;

export const renderArticleDraft = (vars: ArticleDraftVars = {}) => renderPrompt('articles.draft', vars);
export const renderEditorialAnalysis = (vars: EditorialAnalysisVars) =>
  renderPrompt('articles.editorial-analysis', vars);
export const renderBallotCandidateResearch = (vars: CandidateResearchVars) =>
  renderPrompt('ballot.candidate-research', vars);
export const renderBallotCandidateRoster = (vars: CandidateRosterVars) =>
  renderPrompt('ballot.candidate-roster', vars);
export const renderBallotContestResearch = (vars: ContestResearchVars) =>
  renderPrompt('ballot.contest-research', vars);
export const renderBallotQuestionResearch = (vars: QuestionResearchVars) =>
  renderPrompt('ballot.question-research', vars);
export const renderCivicLevelResearch = (vars: CivicLevelResearchVars) =>
  renderPrompt('vision.civic-level-research', vars);
export const renderImportFromSource = (vars: ImportFromSourceVars) =>
  renderPrompt('vision.import-from-source', vars);
export const renderLearningWithAi = (vars: LearningWithAiVars) => renderPrompt('vision.learning-with-ai', vars);
export const renderResearch = (vars: ResearchVars) => renderPrompt('vision.research', vars);

export type {
  ArticleDraftVars,
  CandidateResearchVars,
  CandidateRosterVars,
  CivicLevelResearchVars,
  ContestResearchVars,
  EditorialAnalysisVars,
  ImportFromSourceVars,
  LearningWithAiVars,
  QuestionResearchVars,
  ResearchVars,
};
export { PromptVariablesError, UnknownPromptError, type PromptVariableIssue } from '../render/errors.js';
export type { ValidationResult } from '../render/engine.js';
