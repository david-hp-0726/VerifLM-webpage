# VerifLM Project Page Skeleton

A Vite + React project page skeleton for an interactive VerifLM sampler replay.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Simplified asset layout

Each benchmark has only two asset folders:

```text
public/assets/sampler_demos/<benchmark_id>/pictures
public/assets/sampler_demos/<benchmark_id>/videos
```

Current benchmark IDs:

```text
mug_on_rack
plate_on_rack
```

For `mug_on_rack`, use the `mug_` prefix. For `plate_on_rack`, use the `plate_` prefix.

Required pictures per benchmark:

```text
pictures/input_scene.png
pictures/goal_edit.png
pictures/<prefix>_vlm_input.png
pictures/<prefix>_vlm_candidate1.png
pictures/<prefix>_vlm_candidate2.png
pictures/<prefix>_vlm_candidate3.png
pictures/<prefix>_novlm_candidate1.png
pictures/<prefix>_novlm_candidate2.png
pictures/<prefix>_novlm_candidate3.png
```

Required videos per benchmark:

```text
videos/unconstrained.mp4
videos/constrained.mp4
videos/<prefix>_vlm_traj1.webm
videos/<prefix>_vlm_traj2.webm
videos/<prefix>_vlm_traj3.webm
videos/<prefix>_novlm_traj1.webm
videos/<prefix>_novlm_traj2.webm
videos/<prefix>_novlm_traj3.webm
```

## Failed candidates

Mark failed candidates in `public/assets/sampler_demos/manifest.json`:

```json
"failedCandidates": {
  "novlm": [2],
  "vlm": [3]
}
```

Candidate indices are 1-based. Failed candidates are selectable for inspection, but they do not unlock the Execution stage.
