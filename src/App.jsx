import React from "react";
import WorkHoursTracker from "./components/WorkHoursTracker";
import "./App.css";

function App() {
  return (
    <div
      className="app-container"
      style={{
        maxWidth: "100vw",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <WorkHoursTracker />
    </div>
  );
}

export default App;
