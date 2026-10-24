import { bundle } from '../generated/symthink-api.js';
import { createRenderer } from '../render/engine.js';
import { sourceDiscovery, type SourceDiscoveryVars } from '../schemas/ballot/source-discovery.js';
import { upcomingElections, type UpcomingElectionsVars } from '../schemas/ballot/upcoming-elections.js';
import { orientationRepair, type OrientationRepairVars } from '../schemas/civic-areas/orientation-repair.js';
import { orientation, type OrientationVars } from '../schemas/civic-areas/orientation.js';
import { synthesis, type SynthesisVars } from '../schemas/civic-listening/synthesis.js';
import { labels, type LabelsVars } from '../schemas/in-app/labels.js';
import { pdfCitation, type PdfCitationVars } from '../schemas/in-app/pdf-citation.js';
import { rephraseOptions, type RephraseOptionsVars } from '../schemas/in-app/rephrase-options.js';
import { rephrase, type RephraseVars } from '../schemas/in-app/rephrase.js';
import { singleLabel, type SingleLabelVars } from '../schemas/in-app/single-label.js';
import { warSummary, type WarSummaryVars } from '../schemas/in-app/war-summary.js';

export const symthinkApiPrompts = {
  'ballot.source-discovery': sourceDiscovery,
  'ballot.upcoming-elections': upcomingElections,
  'civic-areas.orientation': orientation,
  'civic-areas.orientation-repair': orientationRepair,
  'civic-listening.synthesis': synthesis,
  'in-app.labels': labels,
  'in-app.pdf-citation': pdfCitation,
  'in-app.rephrase': rephrase,
  'in-app.rephrase-options': rephraseOptions,
  'in-app.single-label': singleLabel,
  'in-app.war-summary': warSummary,
};

export type SymthinkApiPromptId = keyof typeof symthinkApiPrompts;

const renderer = createRenderer(symthinkApiPrompts, bundle);

/**
 * Renders any symthink-api prompt by id. `system_user` prompts return `{ system, user }`;
 * `single` prompts return a string. Throws `PromptVariablesError` when variables are invalid.
 */
export const renderPrompt = renderer.render;
/** Checks variables without rendering. */
export const validatePromptVars = renderer.validate;
export const symthinkApiPromptIds = renderer.ids;

export const renderBallotSourceDiscovery = (vars: SourceDiscoveryVars) =>
  renderPrompt('ballot.source-discovery', vars);
export const renderUpcomingElections = (vars: UpcomingElectionsVars) =>
  renderPrompt('ballot.upcoming-elections', vars);
export const renderCivicAreaOrientation = (vars: OrientationVars) => renderPrompt('civic-areas.orientation', vars);
export const renderCivicAreaOrientationRepair = (vars: OrientationRepairVars = {}) =>
  renderPrompt('civic-areas.orientation-repair', vars);
export const renderCivicListeningSynthesis = (vars: SynthesisVars) =>
  renderPrompt('civic-listening.synthesis', vars);
export const renderLabels = (vars: LabelsVars) => renderPrompt('in-app.labels', vars);
export const renderPdfCitation = (vars: PdfCitationVars) => renderPrompt('in-app.pdf-citation', vars);
export const renderRephrase = (vars: RephraseVars) => renderPrompt('in-app.rephrase', vars);
export const renderRephraseOptions = (vars: RephraseOptionsVars) => renderPrompt('in-app.rephrase-options', vars);
export const renderSingleLabel = (vars: SingleLabelVars) => renderPrompt('in-app.single-label', vars);
export const renderWarSummary = (vars: WarSummaryVars) => renderPrompt('in-app.war-summary', vars);

export type {
  LabelsVars,
  OrientationRepairVars,
  OrientationVars,
  PdfCitationVars,
  RephraseOptionsVars,
  RephraseVars,
  SingleLabelVars,
  SourceDiscoveryVars,
  SynthesisVars,
  UpcomingElectionsVars,
  WarSummaryVars,
};
export { PromptVariablesError, UnknownPromptError, type PromptVariableIssue } from '../render/errors.js';
export type { SystemUserPrompt } from '../render/define.js';
export type { ValidationResult } from '../render/engine.js';
