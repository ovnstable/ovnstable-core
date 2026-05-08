const statuses = [
  {
    label: "Isolation",
    value: "Only files under sandbox/mini-project/",
  },
  {
    label: "Integration",
    value: "Mock data, no production imports",
  },
  {
    label: "Review state",
    value: "Ready for teammate inspection",
  },
];

const statusGrid = document.querySelector("#status-grid");
const refreshButton = document.querySelector("#refresh-button");

function renderStatuses() {
  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (!statusGrid) {
    return;
  }

  statusGrid.innerHTML = statuses
    .map(
      (status) => `
        <article class="status-card">
          <strong>${status.label}</strong>
          <span>${status.value}</span>
        </article>
      `,
    )
    .join("");

  statusGrid.insertAdjacentHTML(
    "beforeend",
    `
      <article class="status-card">
        <strong>Last refreshed</strong>
        <span>${timestamp}</span>
      </article>
    `,
  );
}

refreshButton?.addEventListener("click", renderStatuses);
renderStatuses();
