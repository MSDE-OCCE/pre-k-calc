<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
// Constants for the sliding scale levels
const slidingScale = [
  { level: "1", fplMin: 301, fplMax: 360, familyShare: 0.01 },
  { level: "2", fplMin: 361, fplMax: 420, familyShare: 0.02 },
  { level: "3", fplMin: 421, fplMax: 480, familyShare: 0.04 },
  { level: "4", fplMin: 481, fplMax: 540, familyShare: 0.06 },
  { level: "5", fplMin: 541, fplMax: 600, familyShare: 0.07 }
];

const costOfCare = 13003;
const noMonths = 10;
const noWeeks = Math.floor((52 / 12) * noMonths);
const FPLYear = 2022;

// This function looks up the FPL threshold based on the family size.
// If the family size is greater than 8, it calculates the threshold using the fixed increment.
async function fetchPovertyThreshold(householdSize) {
  const apiUrl = "https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines/api/" + FPLYear + "/us/";

  try {
    if (householdSize <= 8) {
      // Single API call for household sizes 1 to 8
      const response = await fetch(apiUrl + householdSize);
      const data = await response.json();
      return Number(data.data.income);
    } else {
      // Two API calls for household sizes greater than 8
      const response1 = await fetch(apiUrl + 1);
      const data1 = await response1.json();
      const income1 = Number(data1.data.income); // Convert to number

      const response2 = await fetch(apiUrl + 2);
      const data2 = await response2.json();
      const income2 = Number(data2.data.income); // Convert to number

      // Calculate the threshold using the formula
      return income1 + ((income2 - income1) * (householdSize - 1));
    }
  } catch (error) {
    console.error("Error fetching poverty thresholds:", error);
    return null; // Or handle the error as needed
  }
}

function calculateLevel(fplPercentage) {
    // Check the FPL percentage against the sliding scale to determine the level
    if (fplPercentage < slidingScale[0].fplMin) {
        return 0; // Tier I
    } else if (fplPercentage >= slidingScale[0].fplMin && fplPercentage <= slidingScale[0].fplMax) {
        return 1; // Tier II
    } else if (fplPercentage >= slidingScale[1].fplMin && fplPercentage <= slidingScale[1].fplMax) {
        return 2; // Tier II
    } else if (fplPercentage >= slidingScale[2].fplMin && fplPercentage <= slidingScale[2].fplMax) {
        return 3; // Tier II
    } else if (fplPercentage >= slidingScale[3].fplMin && fplPercentage <= slidingScale[3].fplMax) {
        return 4; // Tier II
    } else if (fplPercentage >= slidingScale[4].fplMin && fplPercentage <= slidingScale[4].fplMax) {
        return 5; // Tier II
    } else {
        return 9; // Tier III
    }
}

// This function determines the family's share based on the FPL percentage.
// It returns the family share percentage if the FPL percentage falls within the sliding scale levels,
// otherwise it returns "N/A" to indicate that the FPL percentage does not fall within the defined levels.
function getFamilyShare(fplPercentage) {
  for (let scale of slidingScale) {
    if (fplPercentage >= scale.fplMin && fplPercentage <= scale.fplMax) {
      return scale.familyShare;
    }
  }
  return "N/A"; // FPL percentage does not fall within the defined sliding scale levels
}

function adjustTier(level, disabilityFlag, englishLearnerFlag, homelessFlag, childAge) {
    /* (3 OR 4 yo) AND Tier I income, then Tier I
       (3 OR 4 yo) AND Homeless, then Tier I */
    if (level === 0 || homelessFlag) {
        return "Tier I";
    /* 4 yo AND Tier II income, then Tier II */
    } else if (childAge === 4 && level > 0 && level < 9) {
        return "Tier II";
    /* 4 yo AND Tier II income AND (Child with disabilities OR Multilingual learner), then Tier I */
    } else if (childAge === 4 && level > 0 && level < 9 && (disabilityFlag || englishLearnerFlag)) {
        return "Tier I";
    /* 4 yo AND Tier III income, then Tier III */
    } else if (childAge === 4 && level === 9) {
        return "Tier III";
    /* 3 yo AND Tier II income AND (Child with disabilities OR Multilingual learner), then Tier II */
    } else if (childAge === 3 && level > 0 && level < 9 && (disabilityFlag || englishLearnerFlag)) {
        return "Tier II";
    /* 3 yo AND (Tier II or Tier III income), then Tier III */
    } else if (childAge === 3 && level > 0) {
        return "Tier III";
    /* Default: Tier III */
    } else {
        return "Tier III";
    }
}

function calculateFamilyShare(familyShare, adjustedTier, fplPercentage) {
    if (adjustedTier === "Tier I") {
        return 0;
    } else if (adjustedTier === "Tier II") {
        const familyShareEntry = slidingScale.find(scale => 
          fplPercentage >= scale.fplMin && fplPercentage <= scale.fplMax);
        return familyShareEntry ? familyShareEntry.familyShare : "N/A";
    } else if (adjustedTier === "Tier III") {
        return "N/A";
    }
    
    return familyShare;
}

// Use a function to format numbers
function formatNumber(num) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
    
async function calculatePayment(householdSize, householdIncome, childAge, disabilityFlag, englishLearnerFlag, homelessFlag) {
    householdSize = parseInt(householdSize);
    householdIncome = parseInt(householdIncome);

    // Validation
    if (isNaN(householdSize) || householdSize < 1 || householdSize > 20) {
        alert("Please enter your household size (1-20)");
        return;
    }
    if (isNaN(householdIncome) || householdIncome < 0) {
        alert("Please enter your household income");
        return;
    }
    if (isNaN(childAge) || childAge < 3 || childAge > 4) {
        alert("Please select the child's age (3 or 4)");
        return;
    }

    // Await the result of the fetchPovertyThreshold call
    const fplThreshold = await fetchPovertyThreshold(householdSize);
    const fplPercentage = Math.floor((householdIncome / fplThreshold) * 100);
    const level = calculateLevel(fplPercentage);
    const adjustedTier = adjustTier(level, disabilityFlag, englishLearnerFlag, homelessFlag, childAge);
    const familyShare = getFamilyShare(fplPercentage);
    const familySharePercent = calculateFamilyShare(familyShare, adjustedTier, fplPercentage);
    
    let perPupilFamilyShare;
    if (familySharePercent === "N/A") {
        perPupilFamilyShare = costOfCare;
    } else {
        const familyShareAmount = familySharePercent * householdIncome;
        perPupilFamilyShare = (familyShareAmount >= costOfCare) ? costOfCare : familyShareAmount;
    }

    const weeklyPayment = perPupilFamilyShare / noWeeks;
    const monthlyPayment = perPupilFamilyShare / noMonths;
    const stateShareCostOfCare = costOfCare - perPupilFamilyShare;

    let resultsHtml = '<table class="table">';
    resultsHtml += "<tr><td>FPL Data:</td><td>" + FPLYear + "</td></tr>";
    resultsHtml += "<tr><td>Household Size:</td><td>" + householdSize + "</td></tr>";
    resultsHtml += "<tr><td>Household Income:</td><td>$" + formatNumber(householdIncome) + "</td></tr>";
    resultsHtml += "<tr><td>Child's Age:</td><td>" + formatNumber(childAge) + "</td></tr>";
    resultsHtml += "<tr><td>Disability Flag:</td><td>" + (disabilityFlag ? "Yes" : "No") + "</td></tr>";
    resultsHtml += "<tr><td>English Learner Flag:</td><td>" + (englishLearnerFlag ? "Yes" : "No") + "</td></tr>";
    resultsHtml += "<tr><td>Homeless Flag:</td><td>" + (homelessFlag ? "Yes" : "No") + "</td></tr>";
    resultsHtml += "<tr><td>FPL Threshold:</td><td>$" + formatNumber(fplThreshold) + "</td></tr>";
    resultsHtml += "<tr><td>Federal Poverty Level:</td><td>" + formatNumber(fplPercentage) + "%</td></tr>";
    resultsHtml += "<tr><td>Level (0 = Tier I, 1-5 = Tier II, 9 = Tier III):</td><td>" + level + "</td></tr>";
    resultsHtml += "<tr><td>Family Share (% of Annual Income):</td><td>" + (familySharePercent !== "N/A" ? (familySharePercent * 100).toFixed(1) + "%" : familySharePercent) + "</td></tr>";
    resultsHtml += "<tr><td>Tier:</td><td>" + adjustedTier + "</td></tr>";
    resultsHtml += "<tr><td>Family Share of Cost of Care:</td><td>$" + formatNumber(perPupilFamilyShare) + "</td></tr>";
    resultsHtml += "<tr><td>State and Local Share of Cost of Care:</td><td>$" + formatNumber(stateShareCostOfCare) + "</td></tr>";
    resultsHtml += "<tr><td>Weekly Co-Pay (Based on " + noWeeks + " Weeks):</td><td>$" + weeklyPayment.toFixed(2) + "</td></tr>";
    resultsHtml += "<tr><td>Monthly Co-Pay (Based on " + noMonths + " Months):</td><td>$" + monthlyPayment.toFixed(2) + "</td></tr>";
    resultsHtml += "</table>";

    document.getElementById('results').innerHTML = resultsHtml;

    var ctx = document.getElementById('DonutChart').getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Per Pupil Family Share', 'State Share Cost of Care'],
            datasets: [{
                label: 'Cost Distribution',
                data: [perPupilFamilyShare, stateShareCostOfCare],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: true
        }
    });
}
</script>