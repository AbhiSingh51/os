document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("banker-form");
    const matrixSection = document.getElementById("matrix-section");
    const matricesDiv = document.getElementById("matrices");
    const calculateBtn = document.getElementById("calculate-btn");
    const resultSection = document.getElementById("result-section");
    const resultDiv = document.getElementById("result");
    const availableDisplay = document.createElement("div");
    availableDisplay.id = "available-display";
    availableDisplay.style.marginTop = "20px";
    availableDisplay.style.textAlign = "center";

    let processes = 0;
    let resources = 0;
    let allocation = [];
    let maximum = [];
    let available = [];
    let need = [];
    let totalResources = [];

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        processes = parseInt(document.getElementById("processes").value);
        resources = parseInt(document.getElementById("resources").value);
        if (resources > 3) {
            alert("This version supports up to 3 resources labeled A, B, C.");
            return;
        }
        generateMatrices();
        matrixSection.style.display = "block";
        resultSection.style.display = "none";
    });

    function generateMatrices() {
        matricesDiv.innerHTML = "";
        matricesDiv.appendChild(createMatrix("Allocation", "allocation"));
        matricesDiv.appendChild(createMatrix("Maximum", "maximum"));
        matricesDiv.appendChild(createTotalResourcesMatrix());
        matricesDiv.appendChild(createNeedMatrix());
        if (!document.getElementById("available-display")) {
            matrixSection.appendChild(availableDisplay);
        }
    }

    function createMatrix(title, prefix) {
        const container = document.createElement("div");
        container.innerHTML = `<h3>${title} Matrix</h3>`;
        const table = document.createElement("table");
        table.classList.add("matrix-table");

        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        headRow.innerHTML = `<th>Process</th>`;
        for (let j = 0; j < resources; j++) {
            headRow.innerHTML += `<th>${getResourceLabel(j)}</th>`;
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        for (let i = 0; i < processes; i++) {
            const row = document.createElement("tr");
            row.innerHTML = `<td>P${i}</td>`;
            for (let j = 0; j < resources; j++) {
                const td = document.createElement("td");
                const input = document.createElement("input");
                input.type = "number";
                input.min = "0";
                input.required = true;
                input.id = `${prefix}-${i}-${j}`;
                td.appendChild(input);
                row.appendChild(td);
            }
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        container.appendChild(table);
        return container;
    }

    function createTotalResourcesMatrix() {
        const container = document.createElement("div");
        container.innerHTML = `<h3>Total System Resources</h3>`;
        const table = document.createElement("table");
        table.classList.add("matrix-table");

        const tr = document.createElement("tr");
        for (let j = 0; j < resources; j++) {
            const td = document.createElement("td");
            td.innerHTML = `<label>Total ${getResourceLabel(j)} = </label><input type="number" min="0" id="total-${j}" required />`;
            tr.appendChild(td);
        }
        table.appendChild(tr);
        container.appendChild(table);
        return container;
    }

    function createNeedMatrix() {
        const container = document.createElement("div");
        container.innerHTML = `<h3>Remaining Need</h3>`;
        const table = document.createElement("table");
        table.classList.add("matrix-table");
        table.id = "need-table";

        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        headRow.innerHTML = `<th>Process</th>`;
        for (let j = 0; j < resources; j++) {
            headRow.innerHTML += `<th>${getResourceLabel(j)}</th>`;
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        for (let i = 0; i < processes; i++) {
            const row = document.createElement("tr");
            row.id = `need-row-${i}`;
            row.innerHTML = `<td>P${i}</td>`;
            for (let j = 0; j < resources; j++) {
                const td = document.createElement("td");
                td.textContent = "-";
                td.id = `need-${i}-${j}`;
                row.appendChild(td);
            }
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        container.appendChild(table);
        return container;
    }

    function getResourceLabel(index) {
        const labels = ["A", "B", "C"];
        return labels[index] || `R${index}`;
    }

    calculateBtn.addEventListener("click", () => {
        if (!readMatrices()) {
            resultDiv.innerHTML = `<p style="color: red;">Please fill all fields with valid numbers.</p>`;
            resultSection.style.display = "block";
            return;
        }
        calculateAvailableResources();
        updateNeedMatrix();
        displayAvailableResources();

        //  NEW: Deadlock prevention pre-check
        if (!isSafeToProceed()) {
            resultSection.style.display = "block";
            resultDiv.innerHTML = `<p style="color: orange;">
                ⚠️ Warning: Current allocation leaves no available resources to satisfy any process.<br>
                Adjust allocation or increase total resources to avoid a deadlock state.
            </p>`;
            return; // Stop here — don’t run algorithm
        }

        const safeSequence = bankersAlgorithm();
        displayResult(safeSequence);
        renderKnapChart();
    });

    function readMatrices() {
        allocation = Array.from({ length: processes }, () => Array(resources).fill(0));
        maximum = Array.from({ length: processes }, () => Array(resources).fill(0));
        totalResources = Array(resources).fill(0);
        
        try {
            for (let i = 0; i < processes; i++) {
                for (let j = 0; j < resources; j++) {
                    allocation[i][j] = parseInt(document.getElementById(`allocation-${i}-${j}`).value);
                    maximum[i][j] = parseInt(document.getElementById(`maximum-${i}-${j}`).value);
                }
            }
            for (let j = 0; j < resources; j++) {
                totalResources[j] = parseInt(document.getElementById(`total-${j}`).value);
            }
            return true;
        } catch {
            return false;
        }
    }

    function calculateAvailableResources() {
        available = Array(resources).fill(0);
        for (let j = 0; j < resources; j++) {
            let allocated = 0;
            for (let i = 0; i < processes; i++) {
                allocated += allocation[i][j];
            }
            available[j] = totalResources[j] - allocated;
        }
    }

    function updateNeedMatrix() {
        need = maximum.map((row, i) => row.map((val, j) => val - allocation[i][j]));
        for (let i = 0; i < processes; i++) {
            for (let j = 0; j < resources; j++) {
                document.getElementById(`need-${i}-${j}`).textContent = need[i][j];
            }
        }
    }

    // NEW: Check if system is in a deadlock-prone state
    function isSafeToProceed() {
        let allAvailableZero = available.every(val => val === 0);
        let anyNeedRemaining = need.some(row => row.some(val => val > 0));
        return !(allAvailableZero && anyNeedRemaining);
    }

    function bankersAlgorithm() {
        const work = [...available];
        const finish = Array(processes).fill(false);
        const sequence = [];
        let count = 0;

        while (count < processes) {
            let found = false;
            for (let i = 0; i < processes; i++) {
                if (!finish[i]) {
                    let canAllocate = true;
                    for (let j = 0; j < resources; j++) {
                        if (need[i][j] > work[j]) {
                            canAllocate = false;
                            break;
                        }
                    }
                    if (canAllocate) {
                        for (let j = 0; j < resources; j++) {
                            work[j] += allocation[i][j];
                        }
                        finish[i] = true;
                        sequence.push(`P${i}`);
                        found = true;
                        count++;
                        i = -1;
                    }
                }
            }
            if (!found) break;
        }
        return count === processes ? sequence : null;
    }

    function displayResult(sequence) {
        resultSection.style.display = "block";
        if (sequence) {
            resultDiv.innerHTML = `<p style="color: lightgreen;">System is in a SAFE state.<br>Safe Sequence: ${sequence.join(" → ")}</p>`;
        } else {
            resultDiv.innerHTML = `<p style="color: red;">System is in an UNSAFE state. Deadlock may occur.</p>`;
        }
    }

    function displayAvailableResources() {
        availableDisplay.innerHTML = `<h3>Available Resources</h3>`;
        const list = document.createElement("div");
        list.style.display = "flex";
        list.style.justifyContent = "center";
        list.style.gap = "20px";
        for (let j = 0; j < resources; j++) {
            const box = document.createElement("div");
            box.style.padding = "15px";
            box.style.border = "1px solid #fff";
            box.style.borderRadius = "10px";
            box.style.minWidth = "80px";
            box.style.textAlign = "center";
            box.innerHTML = `<strong>${getResourceLabel(j)}</strong><br>${available[j]}`;
            list.appendChild(box);
        }
        availableDisplay.appendChild(list);
    }

    function renderKnapChart() {
        let oldChart = document.getElementById("knap-chart");
        if (oldChart) oldChart.remove();

        const chart = document.createElement("div");
        chart.id = "knap-chart";
        chart.style.marginTop = "30px";
        chart.style.textAlign = "center";
        chart.innerHTML = `<h3>Resource Usage Chart</h3>`;
        const bars = document.createElement("div");
        bars.style.display = "flex";
        bars.style.justifyContent = "center";
        bars.style.gap = "15px";

        for (let j = 0; j < resources; j++) {
            const barContainer = document.createElement("div");
            barContainer.style.width = "60px";
            barContainer.style.background = "rgba(255,255,255,0.1)";
            barContainer.style.border = "1px solid #fff";
            barContainer.style.borderRadius = "8px";
            barContainer.style.padding = "5px";
            const bar = document.createElement("div");
            bar.style.width = "100%";
            bar.style.height = `${available[j] * 10}px`;
            bar.style.background = "linear-gradient(45deg, #2575fc, #6a11cb)";
            bar.style.borderRadius = "6px";
            bar.title = `${getResourceLabel(j)} = ${available[j]}`;
            barContainer.appendChild(bar);
            bars.appendChild(barContainer);
        }
        chart.appendChild(bars);
        matrixSection.appendChild(chart);
    }
});
