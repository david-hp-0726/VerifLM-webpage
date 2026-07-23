import { useEffect, useMemo, useState } from "react";

const STAGES = [
  { id: "goal", label: "Goal", caption: "edit + pose" },
  { id: "sampling", label: "Sampling", caption: "search" },
  { id: "candidates", label: "Candidates", caption: "valid poses" },
  { id: "execution", label: "Execution", caption: "trajectory" }
];

const MODES = [
  { id: "unconstrained", key: "novlm", label: "Unconstrained", samplerVideo: "unconstrained.mp4" },
  { id: "vlm_constrained", key: "vlm", label: "VLM-constrained", samplerVideo: "constrained.mp4" }
];

const AXES = [
  { id: "x", label: "X" },
  { id: "y", label: "Y" },
  { id: "z", label: "Z" },
  { id: "roll", label: "Roll" },
  { id: "pitch", label: "Pitch" },
  { id: "yaw", label: "Yaw" }
];

const DEFAULT_SEARCH_GUIDANCE = {
  x: "minor correction",
  y: "minor correction",
  z: "minor correction",
  roll: "minor correction",
  pitch: "minor correction",
  yaw: "minor correction"
};

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

function assetPath(benchmark, folder, filename) {
  if (!benchmark?.basePath || !filename) return "";
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const bench = benchmark.basePath.replace(/^\/|\/$/g, "");
  return `${base}/${bench}/${folder}/${filename}`;
}

function picturePath(benchmark, filename) {
  return assetPath(benchmark, "pictures", filename);
}

function videoPath(benchmark, filename) {
  return assetPath(benchmark, "videos", filename);
}

function getMode(modeId) {
  return MODES.find((mode) => mode.id === modeId) || MODES[0];
}

function isSuccessfulCandidate(candidate) {
  return Boolean(candidate) && candidate.status !== "failed" && candidate.success !== false;
}

function getCandidateCount(benchmark) {
  return benchmark.candidateCount || 3;
}

function makeCandidate(benchmark, mode, index) {
  const n = index + 1;
  const prefix = benchmark.assetPrefix || benchmark.activeObject;
  const failed = new Set(benchmark.failedCandidates?.[mode.key] || []).has(n);
  const failureReason = benchmark.failureReasons?.[`${mode.key}_${n}`] || "Task failure";

  return {
    id: `cand_${n}`,
    caption: `Candidate ${n}`,
    image: picturePath(benchmark, `${prefix}_${mode.key}_candidate${n}.png`),
    trajectoryAnim: videoPath(benchmark, `${prefix}_${mode.key}_traj${n}.mp4`),
    status: failed ? "failed" : "success",
    success: !failed,
    failureReason: failed ? failureReason : undefined
  };
}

function getCandidates(benchmark, mode) {
  return Array.from({ length: getCandidateCount(benchmark) }, (_, index) => (
    makeCandidate(benchmark, mode, index)
  ));
}

function formatGuidanceValue(rawValue) {
  const raw = String(rawValue || "minor correction").trim().toLowerCase();

  const hasPositive = raw.includes("+");
  const hasNegative = raw.includes("-") || raw.includes("−");
  const direction = hasPositive ? " (+)" : hasNegative ? " (-)" : "";

  if (raw.startsWith("correct") || raw.startsWith("tight")) {
    return `correct${direction}`;
  }

  if (raw.startsWith("major") || raw.startsWith("wide")) {
    return `major correction${direction}`;
  }

  return `minor correction${direction}`;
}

function getGuidanceVariant(value) {
  if (value.startsWith("correct")) return "correct";
  if (value.startsWith("major correction")) return "major";
  return "minor";
}

function getSearchGuidance(benchmark, mode) {
  const rawGuidance = {
    ...DEFAULT_SEARCH_GUIDANCE,
    ...(benchmark.searchGuidance?.[mode.key] || benchmark.searchSpace?.[mode.key] || {})
  };

  return Object.fromEntries(
    Object.entries(rawGuidance).map(([axis, value]) => [axis, formatGuidanceValue(value)])
  );
}

function getNextReadyStage(currentStage, completed) {
  if (currentStage === "goal" && completed.goal) return "sampling";
  if (currentStage === "sampling" && completed.sampling) return "candidates";
  if (currentStage === "candidates" && completed.candidates) return "execution";
  return null;
}

function MediaBox({ src, alt, className = "", placeholder = "Replace with asset", onEnded }) {
  const [failed, setFailed] = useState(false);
  const isVideo = /\.(webm|mp4|mov)$/i.test(src || "");

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`media placeholder-media ${className}`} role="img" aria-label={alt}>
        <span>{placeholder}</span>
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        className={`media ${className}`}
        src={src}
        aria-label={alt}
        autoPlay
        muted
        playsInline
        controls
        onEnded={onEnded}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      className={`media ${className}`}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}

function ActionMediaBox({ label, sublabel, onClick, className = "", icon = "▶" }) {
  return (
    <button
      type="button"
      className={`media placeholder-media action-media ${className}`}
      onClick={onClick}
      aria-label={label}
    >
      <span className="action-click-badge">Click to continue</span>
      <span className="action-media-icon" aria-hidden="true">{icon}</span>
      <span className="action-media-label">{label}</span>
      {sublabel && <small>{sublabel}</small>}
    </button>
  );
}

function BenchmarkTabs({ benchmarks, activeId, onChange }) {
  return (
    <div className="tabs" role="tablist" aria-label="Benchmark selection">
      {benchmarks.map((benchmark) => (
        <button
          key={benchmark.id}
          className={classNames("tab", benchmark.id === activeId && "active")}
          onClick={() => onChange(benchmark.id)}
          type="button"
        >
          {benchmark.title}
        </button>
      ))}
    </div>
  );
}

function StageStepper({ stage, completed, selectedCandidate, nextReadyStage, onChange }) {
  function canVisit(stageId) {
    if (stageId === "goal") return true;
    if (stageId === "sampling") return completed.goal;
    if (stageId === "candidates") return completed.sampling;
    if (stageId === "execution") return isSuccessfulCandidate(selectedCandidate);
    return false;
  }

  return (
    <nav className="stage-stepper stage-stepper-four" aria-label="Sampler stages">
      {STAGES.map((item, index) => {
        const active = item.id === stage;
        const complete = completed[item.id];
        const disabled = !canVisit(item.id);
        const ready = item.id === nextReadyStage;

        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            className={classNames(
              "stage-step",
              active && "active",
              complete && "complete",
              ready && "ready",
              disabled && "disabled"
            )}
            onClick={() => onChange(item.id)}
          >
            <span className="stage-dot">{complete ? "✓" : index + 1}</span>
            <span className="stage-copy">
              <span>{item.label}</span>
              <small>{item.caption}</small>
              {ready && <em className="ready-badge">Ready</em>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function ModeSelector({ activeModeId, onChange }) {
  return (
    <div className="mode-row">
      <span className="mode-label">Sampling mode</span>
      <div className="mode-toggle" role="radiogroup" aria-label="Sampling mode">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={mode.id === activeModeId}
            className={classNames("mode-option", mode.id === activeModeId && "active")}
            onClick={() => onChange(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchSpaceStrip({ benchmark, mode }) {
  const searchGuidance = getSearchGuidance(benchmark, mode);
  const isVlmMode = mode.key === "vlm";

  return (
    <div className="search-space-strip">
      <div className="search-space-heading">
        <span className="search-space-title">Search guidance</span>
        <span className="search-space-note">
          {isVlmMode
            ? "The VLM marks correct axes to preserve and incorrect axes for minor or major correction."
            : "No VLM guidance: every axis uses the same minor-correction range."}
        </span>
      </div>
      <div className="axis-strip">
        {AXES.map((axis) => {
          const value = searchGuidance[axis.id] || "minor correction";
          const variant = getGuidanceVariant(value);

          return (
            <span key={axis.id} className={classNames("axis-chip", variant)}>
              <strong>{axis.label}</strong> {value}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CandidatePicker({ candidates, selectedCandidateId, onSelect, interactive = true }) {
  return (
    <div className="candidate-grid">
      {candidates.map((candidate) => {
        const failed = !isSuccessfulCandidate(candidate);
        const selected = interactive && selectedCandidateId === candidate.id;
        const CandidateElement = interactive ? "button" : "div";

        return (
          <CandidateElement
            key={candidate.id}
            className={classNames(
              "candidate",
              selected && "active",
              failed && "failed",
              !interactive && "inactive"
            )}
            onClick={interactive ? () => onSelect(candidate) : undefined}
            type={interactive ? "button" : undefined}
            aria-disabled={!interactive ? "true" : undefined}
          >
            <div className="candidate-media-wrap">
              <MediaBox
                src={candidate.image}
                alt={candidate.caption}
                placeholder="Candidate render"
              />
              {failed && <span className="candidate-status failed">Failed</span>}
              {!failed && <span className="candidate-status succeeded">Successful</span>}
            </div>
            <span>{candidate.caption}</span>
            {failed && (
              <small className="candidate-failure-reason">
                {candidate.failureReason || "Task failure"}
              </small>
            )}
          </CandidateElement>
        );
      })}
    </div>
  );
}

function GoalStage({ benchmark, goalReady, poseReady, onEdit, onDetectPose }) {
  return (
    <>
    <div className="goal-stage-grid">
      <div>
        <h4>Input</h4>
        <MediaBox
          src={picturePath(benchmark, "input_scene.png")}
          alt={`${benchmark.title} input scene`}
          placeholder="input_scene.png"
        />
      </div>

      <div>
        <h4>Goal edit</h4>
        {goalReady ? (
          <MediaBox
            src={picturePath(benchmark, "goal_edit.png")}
            alt={`${benchmark.title} AI-edited goal`}
            placeholder="goal_edit.png"
          />
        ) : (
          <ActionMediaBox
            label="Generate AI goal"
            sublabel="Click this panel to edit the input image"
            icon="✦"
            onClick={onEdit}
          />
        )}
      </div>
    </div>
      {goalReady && !poseReady && (
        <button type="button" className="goal-pose-action" onClick={onDetectPose}>
          Use perception module to detect and render goal pose
        </button>
      )}

      {poseReady && (
        <div className="goal-rendered-views">
          <SamplingReferenceContext benchmark={benchmark} />
        </div>
      )}
    </>
  );
}

function GoalEditContext({ benchmark }) {
  return (
    <div className="goal-context-card">
      <h4>Goal edit</h4>
      <MediaBox
        src={picturePath(benchmark, "goal_edit.png")}
        alt={`${benchmark.title} AI-edited goal`}
        placeholder="goal_edit.png"
      />
    </div>
  );
}

function SamplingReferenceContext({ benchmark }) {
  const viewGroups = [
    {
      title: "Views with active object frame rendered (for rotation reasoning)",
      views: [
        { title: "Front view", filename: "goal_scene_axes.png" },
        { title: "Back view", filename: "goal_scene_axes_reverse.png" }
      ]
    },
    {
      title: "Views with world frame rendered (for translational reasoning)",
      views: [
        { title: "Front view", filename: "goal_scene_world_axes.png" },
        { title: "Back view", filename: "goal_scene_world_axes_reverse.png" }
      ]
    }
  ];

  return (
    <div className="sampling-views-panel">
      {viewGroups.map((group) => (
        <div className="sampling-view-group" key={group.title}>
          <h4>{group.title}</h4>
          <div className="sampling-views-grid">
            {group.views.map((view) => (
              <div className="sampling-view-card" key={view.filename}>
                <MediaBox
                  className="sampling-view-media"
                  src={picturePath(benchmark, view.filename)}
                  alt={`${benchmark.title} ${group.title} ${view.title}`}
                  placeholder={view.filename}
                />
                <span>{view.title}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SamplingStage({ benchmark, mode, modeId, onModeChange, started, onRun, replayKey }) {
  return (
    <>
      <ModeSelector activeModeId={modeId} onChange={onModeChange} />
      <SearchSpaceStrip benchmark={benchmark} mode={mode} />

      <div className="demo-layout compact sampling-layout">
        <SamplingReferenceContext benchmark={benchmark} />
        <div className="interaction-panel">
          <div className="panel-title-row">
            <h4>{mode.label} replay</h4>
          </div>
          {started ? (
            <MediaBox
              key={`sampling-${mode.id}-${replayKey}`}
              className="main-media"
              src={videoPath(benchmark, mode.samplerVideo)}
              alt={`Sampler animation for ${benchmark.title}`}
              placeholder={mode.samplerVideo}
            />
          ) : (
            <ActionMediaBox
              className="main-media"
              label="Refine and validate pose with sampler"
              sublabel="Click this panel to run sampler"
              icon="▶"
              onClick={onRun}
            />
          )}
        </div>
      </div>
    </>
  );
}

function CandidatesStage({ benchmark, mode, selectedCandidate, onSelect }) {
  const candidates = getCandidates(benchmark, mode);
  const alternateMode = MODES.find((item) => item.id !== mode.id) || MODES[0];
  const alternateCandidates = getCandidates(benchmark, alternateMode);
  const failedSelected = selectedCandidate && !isSuccessfulCandidate(selectedCandidate);

  return (
    <div className="demo-layout compact">
      <GoalEditContext benchmark={benchmark} />
      <div className="interaction-panel">
        <h4>{selectedCandidate ? "Selected candidate" : "Choose a valid candidate"}</h4>
        {selectedCandidate ? (
          <>
            <div className="candidate-preview-wrap">
              <MediaBox
                className="main-media"
                src={selectedCandidate.image}
                alt={selectedCandidate.caption}
                placeholder="Selected candidate"
              />
              {failedSelected && <span className="candidate-status failed preview">Failed</span>}
            </div>
          </>
        ) : (
          <div className="media placeholder-media main-media" role="img" aria-label="Candidate selection">
            <span>Choose one candidate below.</span>
          </div>
        )}
      </div>
      <div className="candidate-section compact span-two-columns">
        <div className="candidate-row">
          <div className="candidate-row-heading">
            <h4>{mode.label} candidate poses</h4>
            <span className="candidate-mode-badge active">Selected sampler</span>
          </div>
          <CandidatePicker
            candidates={candidates}
            selectedCandidateId={selectedCandidate?.id}
            onSelect={onSelect}
          />
        </div>
        <div className="candidate-row inactive">
          <div className="candidate-row-heading">
            <h4>For comparison: {alternateMode.label} candidates</h4>
          </div>
          <CandidatePicker
            candidates={alternateCandidates}
            selectedCandidateId={null}
            onSelect={onSelect}
            interactive={false}
          />
        </div>
      </div>
    </div>
  );
}

function ExecutionStage({ benchmark, selectedCandidate, started, onRun, replayKey }) {
  return (
    <div className="demo-layout compact">
      <GoalEditContext benchmark={benchmark} />
      <div className="interaction-panel">
        <div className="panel-title-row">
          <h4>Executed trajectory</h4>
        </div>
        {started ? (
          <MediaBox
            key={`execution-${selectedCandidate?.id || "none"}-${replayKey}`}
            className="main-media"
            src={selectedCandidate?.trajectoryAnim}
            alt={`Trajectory animation for ${selectedCandidate?.caption || "candidate"}`}
            placeholder="Trajectory video"
          />
        ) : (
          <ActionMediaBox
            className="main-media"
            label="Run trajectory"
            sublabel={selectedCandidate ? `Click this panel to execute ${selectedCandidate.caption}` : "Select a successful candidate first"}
            icon="▶"
            onClick={onRun}
          />
        )}
      </div>
    </div>
  );
}

export default function SamplerDemo({ benchmarks, defaultMode = "vlm_constrained" }) {
  const [benchmarkId, setBenchmarkId] = useState(benchmarks[0]?.id);
  const benchmark = useMemo(
    () => benchmarks.find((item) => item.id === benchmarkId) || benchmarks[0],
    [benchmarks, benchmarkId]
  );

  const [modeId, setModeId] = useState(benchmark.defaultMode || defaultMode);
  const mode = getMode(modeId);

  const [stage, setStage] = useState("goal");
  const [goalReady, setGoalReady] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  const [samplingStarted, setSamplingStarted] = useState(false);
  const [samplingDone, setSamplingDone] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [executionStarted, setExecutionStarted] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  function resetBenchmark(nextId) {
    const nextBenchmark = benchmarks.find((item) => item.id === nextId);
    setBenchmarkId(nextId);
    setModeId(nextBenchmark?.defaultMode || defaultMode);
    setStage("goal");
    setGoalReady(false);
    setPoseReady(false);
    setSamplingStarted(false);
    setSamplingDone(false);
    setSelectedCandidate(null);
    setExecutionStarted(false);
    setReplayKey((value) => value + 1);
  }

  function resetSamplingBranch() {
    setSamplingStarted(false);
    setSamplingDone(false);
    setSelectedCandidate(null);
    setExecutionStarted(false);
    setReplayKey((value) => value + 1);
  }

  function handleGoalEdit() {
    setGoalReady(true);
  }

  function handleDetectPose() {
    setPoseReady(true);
  }

  function handleModeChange(nextModeId) {
    setModeId(nextModeId);
    resetSamplingBranch();
  }

  function handleRunSampler() {
    setSamplingStarted(true);
    setSamplingDone(true);
    setSelectedCandidate(null);
    setExecutionStarted(false);
    setReplayKey((value) => value + 1);
  }

  function handleCandidateSelect(candidate) {
    setSelectedCandidate(candidate);
    setExecutionStarted(false);
  }

  function handleRunExecution() {
    if (!isSuccessfulCandidate(selectedCandidate)) return;
    setExecutionStarted(true);
    setReplayKey((value) => value + 1);
  }

  function canVisit(nextStage) {
    if (nextStage === "goal") return true;
    if (nextStage === "sampling") return poseReady;
    if (nextStage === "candidates") return samplingDone;
    if (nextStage === "execution") return isSuccessfulCandidate(selectedCandidate);
    return false;
  }

  function handleStageChange(nextStage) {
    if (!canVisit(nextStage)) return;
    setStage(nextStage);
  }

  const completed = {
    goal: poseReady,
    sampling: samplingDone,
    candidates: isSuccessfulCandidate(selectedCandidate),
    execution: executionStarted
  };

  const nextReadyStage = getNextReadyStage(stage, completed);

  return (
    <div className="demo card">
      <BenchmarkTabs benchmarks={benchmarks} activeId={benchmark.id} onChange={resetBenchmark} />

      <div className="demo-header compact">
        <div>
          <h3>{benchmark.title}</h3>
          <p><strong>Instruction:</strong> {benchmark.instruction}</p>
        </div>
      </div>

      <StageStepper
        stage={stage}
        completed={completed}
        selectedCandidate={selectedCandidate}
        nextReadyStage={nextReadyStage}
        onChange={handleStageChange}
      />

      {stage === "goal" && (
        <GoalStage
          benchmark={benchmark}
          goalReady={goalReady}
          poseReady={poseReady}
          onEdit={handleGoalEdit}
          onDetectPose={handleDetectPose}
        />
      )}

      {stage === "sampling" && (
        <SamplingStage
          benchmark={benchmark}
          mode={mode}
          modeId={modeId}
          onModeChange={handleModeChange}
          started={samplingStarted}
          onRun={handleRunSampler}
          replayKey={replayKey}
        />
      )}

      {stage === "candidates" && (
        <CandidatesStage
          benchmark={benchmark}
          mode={mode}
          selectedCandidate={selectedCandidate}
          onSelect={handleCandidateSelect}
        />
      )}

      {stage === "execution" && (
        <ExecutionStage
          benchmark={benchmark}
          selectedCandidate={selectedCandidate}
          started={executionStarted}
          onRun={handleRunExecution}
          replayKey={replayKey}
        />
      )}
    </div>
  );
}
