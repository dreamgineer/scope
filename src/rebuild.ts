// Verbosity levels
export enum Verbosity {
  Error = 0,
  Warn = 1,
  Notice = 2,
  Info = 3,
  Talkative = 4,
  Chatty = 5,
  Debug = 6,
  Vomit = 7,
}

// Activity types enum
export enum ActivityType {
  UnknownType = 0,
  CopyPathType = 100,
  FileTransferType = 101,
  RealiseType = 102,
  CopyPathsType = 103,
  BuildsType = 104,
  BuildType = 105,
  OptimiseStoreType = 106,
  VerifyPathsType = 107,
  SubstituteType = 108,
  QueryPathInfoType = 109,
  PostBuildHookType = 110,
  BuildWaitingType = 111,
  FetchTreeType = 112,
}

// Utility types for domain values
export type StorePath = string;
export type Host = string;
export type DerivationPath = string;

// ==========================
// Message Action
// ==========================
export interface NixMsgMessage {
  action: "msg";
  level: Verbosity;
  msg: string;
}

// ==========================
// Start Action (Discriminated Union)
// ==========================
export type NixStartMessage =
  | StartUnknown
  | StartCopyPath
  | StartFileTransfer
  | StartRealise
  | StartCopyPaths
  | StartBuilds
  | StartBuild
  | StartOptimiseStore
  | StartVerifyPaths
  | StartSubstitute
  | StartQueryPathInfo
  | StartPostBuildHook
  | StartBuildWaiting
  | StartFetchTree;

interface StartBase {
  action: "start";
  id: number;
  text: string;
  level: Verbosity;
}

interface StartUnknown extends StartBase {
  type: ActivityType.UnknownType;
  fields: [];
}
interface StartCopyPath extends StartBase {
  type: ActivityType.CopyPathType;
  fields: [StorePath, Host, Host];
}
interface StartFileTransfer extends StartBase {
  type: ActivityType.FileTransferType;
  fields: [string];
}
interface StartRealise extends StartBase {
  type: ActivityType.RealiseType;
  fields: [];
}
interface StartCopyPaths extends StartBase {
  type: ActivityType.CopyPathsType;
  fields: [];
}
interface StartBuilds extends StartBase {
  type: ActivityType.BuildsType;
  fields: [];
}
interface StartBuild extends StartBase {
  type: ActivityType.BuildType;
  fields: [DerivationPath, Host, any, any]; // Only first two are used
}
interface StartOptimiseStore extends StartBase {
  type: ActivityType.OptimiseStoreType;
  fields: [];
}
interface StartVerifyPaths extends StartBase {
  type: ActivityType.VerifyPathsType;
  fields: [];
}
interface StartSubstitute extends StartBase {
  type: ActivityType.SubstituteType;
  fields: [StorePath, Host];
}
interface StartQueryPathInfo extends StartBase {
  type: ActivityType.QueryPathInfoType;
  fields: [StorePath, Host];
}
interface StartPostBuildHook extends StartBase {
  type: ActivityType.PostBuildHookType;
  fields: [DerivationPath];
}
interface StartBuildWaiting extends StartBase {
  type: ActivityType.BuildWaitingType;
  fields: [];
}
interface StartFetchTree extends StartBase {
  type: ActivityType.FetchTreeType;
  fields: [];
}

// ==========================
// Stop Action
// ==========================
export interface NixStopMessage {
  action: "stop";
  id: number;
}

// ==========================
// Result Action (Discriminated Union)
// ==========================
export type NixResultMessage =
  | ResultFileLinked
  | ResultBuildLogLine
  | ResultUntrustedPath
  | ResultCorruptedPath
  | ResultSetPhase
  | ResultProgress
  | ResultSetExpected
  | ResultPostBuildLogLine;

interface ResultBase {
  action: "result";
  id: number;
}

interface ResultFileLinked extends ResultBase {
  type: 100; // FileLinked
  fields: [number, number];
}
interface ResultBuildLogLine extends ResultBase {
  type: 101; // BuildLogLine
  fields: [string];
}
interface ResultUntrustedPath extends ResultBase {
  type: 102; // UntrustedPath
  fields: [StorePath];
}
interface ResultCorruptedPath extends ResultBase {
  type: 103; // CorruptedPath
  fields: [StorePath];
}
interface ResultSetPhase extends ResultBase {
  type: 104; // SetPhase
  fields: [string];
}
interface ResultProgress extends ResultBase {
  type: 105; // Progress
  fields: [number, number, number, number]; // done, expected, running, failed
}
interface ResultSetExpected extends ResultBase {
  type: 106; // SetExpected
  fields: [ActivityType, number]; // activityType as int, number
}
interface ResultPostBuildLogLine extends ResultBase {
  type: 107; // PostBuildLogLine
  fields: [string];
}

// ==========================
// Full Root Discriminated Union
// ==========================
export type NixJSONMessage =
  | NixMsgMessage
  | NixStartMessage
  | NixStopMessage
  | NixResultMessage;