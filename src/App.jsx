import { useEffect, useState } from "react";
import SamplerDemo from "./components/SamplerDemo.jsx";

export default function App() {
  const [manifest, setManifest] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/assets/sampler_demos/manifest.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load sampler demo manifest.");
        }
        return response.json();
      })
      .then(setManifest)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Edit2Pose</p>
        <h1>Image-Edit-Guided 6D Goal Specification for Robotic Manipulation</h1>
        <p className="subtitle">
          We use an edited image as a visual interface for goal pose specification, then sample,
          validate, and rank physically feasible 6D object poses in a digital twin.
        </p>
      </section>

      <section className="section card">
        <h2>Abstract</h2>
        <p className="section-intro">
          [Placeholder] Write a concise abstract describing the problem, the image-edit-to-pose
          pipeline, digital-twin sampling and validation, and the main experimental results.
        </p>
      </section>

      <section className="section card">
        <h2>Overview Video</h2>
        <div className="media placeholder-media hero-video" role="img" aria-label="Video placeholder">
          <span>Replace with teaser video or animated WebP</span>
        </div>
      </section>

      <section className="section">
        <h2>Interactive Sampler Replay</h2>
        <p className="section-intro">
          A pre-rendered replay of the image-edit, sampling, candidate selection, and execution flow.
        </p>

        {error && <p className="error">{error}</p>}
        {manifest?.benchmarks ? (
          <SamplerDemo benchmarks={manifest.benchmarks} defaultMode={manifest.defaultMode} />
        ) : (
          !error && <p className="muted">Loading sampler demo…</p>
        )}
      </section>
    </main>
  );
}
