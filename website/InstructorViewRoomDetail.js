const API = "http://localhost:5000";
const token = localStorage.getItem("accessToken");
const role = localStorage.getItem("userRole");

if (!token || role !== "instructor") {
    window.location.href = "Login.html";
}

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
const roomName = urlParams.get("roomName");

const semesterData = {};
urlParams.forEach((value, key) => {
    if (key !== "roomId" && key !== "roomName") {
        semesterData[key] = value;
    }
});

function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch (e) {
        console.error("Invalid token:", e);
        return null;
    }
}
const decoded = decodeToken(token);
let userId = decoded.user_id;
let userName = decoded.user_name;
const backButton = document.getElementById("backButton");
backButton.addEventListener("click", () => {
    window.location.href = 'InstructorViewRoom.html';
});

if(!roomId || !roomName){
    window.location.href = 'InstructorViewRoom.html';
}

document.getElementById("mainHeader-title").innerText = "" + roomName + " - "
    + semesterData.sem_semester + ", SY: " + 
    semesterData.sem_school_year;

function fTime(timeStr){
    const [hour, minute] = timeStr.split(":");
    let h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
}

const addDays = (d, days) => { let nd=new Date(d); nd.setDate(nd.getDate()+days); return nd; };
const startOfWeek = (d) => { let nd=new Date(d); let day=nd.getDay(); let diff=(day===0?-6:1)-day; return addDays(nd,diff); };
const endOfWeek = (d) => addDays(startOfWeek(d),6);
const formatDate = (d) => d.toLocaleDateString("en-US",{month:"short",day:"2-digit"});
const isSameDay = (a,b) => a.toDateString()===b.toDateString();

const semesterStart=new Date(semesterData.sem_start_date);
const semesterEnd=new Date(semesterData.sem_end_date);

let today=new Date();
let weekStart=startOfWeek(today);
let events=[]; 
let selectedEvent=null;

function formatDates(date){
    if(!date) return '';
    const d = new Date(date);
    if(isNaN(d)) return date;
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(d);
    return formattedDate;
}

function getSubjectColor(type){ 
    return type==="Schedule"?"#FFF":"#bab5b5ff"; 
}

async function fetchTimetable(){
    const weekEnd=endOfWeek(weekStart);
    const start=weekStart.toISOString().slice(0,10);
    const end=weekEnd.toISOString().slice(0,10);

    try {
    const res=await fetch(`${API}/schedules/${roomId}/timetable?weekStart=${start}&weekEnd=${end}`);
    const data=await res.json();
    if(res.ok){
        const mapped=[];
        Object.keys(data.timetable||{}).forEach(day=>{
        data.timetable[day].forEach((s,idx)=>{
            mapped.push({
            id: day+"-"+idx,
            schedule_id:s.schedule_id,
            schedule_date:s.schedule_date,
            title:s.subject_code,
            title2:` (${s.year_section})`,
            subtitle:s.instructor,
            day,
            start:(s.start_time||"00:00").slice(0,5),
            end:(s.end_time||"00:00").slice(0,5),
            oid:s.id,
            color:getSubjectColor(s.type),
            type:s.type
            });
        });
        });
        events=mapped;
        positionEvents();
        renderTimetable();
    } else {
        return showFeedback("error", "Error", data.message || "Something went wrong.");
    }
    } catch(err){
        console.error("Fetch error:",err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    }
}

function formatTime12(hour, minute) {
    let suffix = hour >= 12 ? "PM" : "AM";
    let h = hour % 12 || 12;
    return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function renderTimetable(){
    const weekEnd=endOfWeek(weekStart);
    document.getElementById("weekRange").innerText=`${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

    const days=["Mon","Tue","Wed","Thu","Fri","Sat"];
    const weekDates=days.map((_,i)=>addDays(weekStart,i));
    const startHour=7,endHour=18,slotMinutes=60,rowHeight=40;

    const totalMinutes=(endHour-startHour)*60;
    const rowsCount=Math.ceil(totalMinutes/slotMinutes);

    let html="<div class='header-row'><div class='time-gutter'></div>";
    weekDates.forEach((d,i)=>{
    const isToday=isSameDay(d,today);
    html+=`<div class="header-cell ${isToday?"today":""}">${days[i]} ${d.getDate()}</div>`;
    });
    html+="</div>";

    html+="<div class='row'><div class='time-gutter'>";
    
    for(let i=0;i<=rowsCount;i++){
        let minutes=startHour*60+i*slotMinutes;
        let hour=Math.floor(minutes/60);
        let minute=minutes%60;
        

        html+=`<div class="time-cell">${formatTime12(hour, minute)}</div>`;
    }
    html+="</div>";

    weekDates.forEach((d,dayIdx)=>{
        html+=`<div class='day-column'>`;
        events.filter(ev=>ev._dayIdx===dayIdx).forEach(ev=>{
            html+=`<div class="event" style="top:${ev._top}px;height:${ev._height}px;"
            onclick="openModal('${ev.id}')">
            <span id="evTitle">${ev.title||""}${ev.title2}</span>
            <span id="evInstructor">${getInstructorName(ev.subtitle)}</span>
            </div>`;
        });
        html+="</div>";
    });

    html+="</div>";
    document.getElementById("timetable").innerHTML=html;
}

function getInstructorName(instructorName){
    if(instructorName !== 'TBA'){
        const s = instructorName;
        const firstnameinitial = s[0];

        const words = s.split(' ');
        const lastname = words[words.length - 1];

        const okay = firstnameinitial+'. '+lastname;
        return okay;
    }else{
        return 'TBA'
    }
}

function positionEvents(){
    const dayToIndex={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
    const startHour=7,endHour=18,slotMinutes=60,rowHeight=40;
    const startMin=startHour*60;

    events=events.map((ev)=>{
        const [sh,sm]=ev.start.split(":").map(Number);
        const [eh,em]=ev.end.split(":").map(Number);
        const start=sh*60+sm, end=eh*60+em;
        const clampedStart=Math.max(start,startMin);
        const clampedEnd=Math.min(end,endHour*60);
        const minutesFromTop=clampedStart-startMin;
        const duration=Math.max(clampedEnd-clampedStart,0);
        return {...ev,_dayIdx:dayToIndex[ev.day]||0,_top:(minutesFromTop/slotMinutes)*rowHeight,_height:Math.max((duration/slotMinutes)*rowHeight,rowHeight/4)};
    });
}

fetch("Modal.html")
.then(res => res.text())
.then(html => {
    document.getElementById("feedbackContainer").innerHTML = html;
});

function showFeedback(type, title, message) {
    const modal = document.getElementById("feedbackModal");
    const icon = document.getElementById("feedbackIcon");
    const titleEl = document.getElementById("feedbackTitle");
    const msgEl = document.getElementById("feedbackMessage");

    icon.className = "bi";

    if (type === "success") {
        icon.classList.add("bi-check-circle-fill", "feedback-success");
    } else if (type === "error") {
        icon.classList.add("bi-x-circle-fill", "feedback-error");
    } else {
        icon.classList.add("bi-exclamation-circle-fill", "feedback-warning");
    }

    titleEl.textContent = title;
    msgEl.textContent = message;

    modal.style.display = "flex";

    document.getElementById("feedbackClose").onclick = () => {
        modal.style.display = "none";
    };

    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}

document.getElementById("prevBtn").onclick=()=>{
    const prev=addDays(weekStart,-7);
    if(prev>=semesterStart){ weekStart=prev; fetchTimetable(); }
};
document.getElementById("nextBtn").onclick=()=>{
    const next=addDays(weekStart,7);
    if(next<=semesterEnd){ weekStart=next; fetchTimetable(); }
};

function openModal(id) {
    selectedEvent = events.find(e => e.id === id);
    if (!selectedEvent) return;
    document.getElementById("modalTitle").innerText = selectedEvent.title+" "+selectedEvent.title2;
    document.getElementById("modalContent").innerHTML = `
        <p>Instructor: ${selectedEvent.subtitle||""}</p>
        <p>Date: ${formatDates(selectedEvent.schedule_date)}</p>
        <p>Time: ${fTime(selectedEvent.start)} - ${fTime(selectedEvent.end)}</p>
    `;

    const now = new Date();
    const eventEnd = new Date(
        `${selectedEvent.schedule_date}T${selectedEvent.end}`
    );

    let actions = "";
    if(now < eventEnd){
        if(decoded.user_role === "instructor" && selectedEvent.subtitle === decoded.user_name){
            if (selectedEvent.type === "Schedule") {
                actions += `<div class="modal-btn green" onclick="handleMakeAvailable()">Make Available</div>`;
            }
            if (selectedEvent.type === "Reservation") {
                actions += `<div class="modal-btn green" onclick="handleRemove()">Remove</div>`;
            }
        }else{
            actions += `<div class="modal-btn gray" onclick="closeModal()">Close</div>`;
        }
    }else{
        actions += `<div class="modal-btn gray" onclick="closeModal()">Close</div>`;
    }
    document.getElementById("modalActions").innerHTML = actions;
    document.getElementById("modal").style.display="flex";
}

function closeModal(){ 
    document.getElementById("modal").style.display="none"; 
    selectedEvent=null; 
}

async function handleMakeAvailable() {
    if (!selectedEvent) return;
    try {
    const res = await fetch(
        `${API}/schedules/${selectedEvent.oid}/sched`,
        { method: "DELETE", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        user_id: userId,
        }),
        }
    );
    const data = await res.json();
    if (res.ok) {
        showFeedback("success", "Success!", "Schedule removed successfully!");
        selectedEvent = null;
        fetchTimetable();
        closeModal();
    } else {
        return showFeedback("error", "Error", data.message || "Something went wrong.");
    }
    } catch (err) {
        console.error("Error removing occurrence:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    }
}

async function handleRemove() {
    if (!selectedEvent) return;
    try {
    const res = await fetch(
        `${API}/room-reservations/${selectedEvent.oid}/remove`,
        { method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        user_id: userId,
        }), }
    );
    const data = await res.json();
    if (res.ok) {
        showFeedback("success", "Success!", "Schedule removed successfully!");
        selectedEvent = null;
        fetchTimetable();
        closeModal();
    } else {
        return showFeedback("error", "Error", data.message || "Something went wrong.");
    }
    } catch (err) {
        console.error("Error cancelling reservation:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    }
}

function makeAvailable(){ 
    alert("Make Available for "+selectedEvent.title); 
    closeModal(); 
}
function removeReservation(){ 
    alert("Remove Reservation for "+selectedEvent.title); 
    closeModal(); 
}


async function loadData() {
    try {
        const [subRes, ysRes] = await Promise.all([
        fetch(`${API}/subjects`),
        fetch(`${API}/year-sections`),
        ]);
        const subjects = await subRes.json();
        const yearSections = await ysRes.json();

        const subjectSelect = document.getElementById("reserveSubject");
        subjects.forEach(s => {
        subjectSelect.innerHTML += `<option value="${s.subject_id}">${s.subject_code}</option>`;
        });

        const ysSelect = document.getElementById("reserveYearSection");
        yearSections.forEach(ys => {
        ysSelect.innerHTML += `<option value="${ys.year_section_id}">${ys.year_section_name}</option>`;
        });
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

loadData();

const addButton = document.getElementById("addButton");
const closeReserveModal = document.getElementById("closeReserveModal");
const reserveRoomModal = document.getElementById("reserveRoomModal");
const reserveRoomForm = document.getElementById("reserveRoomForm");
const formErrorReserveSubjectCode = document.getElementById("formErrorReserveSubjectCode");
const formErrorReserveYearSection = document.getElementById("formErrorReserveYearSection");
const formErrorReserveDate = document.getElementById("formErrorReserveDate");
const formErrorReserveStartTime = document.getElementById("formErrorReserveStartTime");
const formErrorReserveEndTime = document.getElementById("formErrorReserveEndTime");

addButton.addEventListener("click", () => {
    reserveRoomForm.reset();
    document.getElementById("reserveRoom").value = roomName;
    reserveRoomModal.style.display = "flex";
});
closeReserveModal.addEventListener("click", () => {
    reserveRoomModal.style.display = "none";
});

reserveRoomForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const date = document.getElementById("reserveDate").value;
    const start = document.getElementById("reserveStartTime").value;
    const end = document.getElementById("reserveEndTime").value;
    const subject = document.getElementById("reserveSubject").value;
    const yearSection = document.getElementById("reserveYearSection").value;
    
    document.querySelectorAll(".error-msg").forEach(x => (x.textContent = ""));

    let hasError = false;

    if (!subject) {
        formErrorReserveSubjectCode.textContent = "Please select a subject.";
        hasError = true;
    }
    if (!yearSection) {
        formErrorReserveYearSection.textContent = "Please select year & section.";
        hasError = true;
    }
    if (!date) {
        formErrorReserveDate.textContent = "Please select a date";
        hasError = true;
    }
    if (!start) {
        formErrorReserveStartTime.textContent = "Start time required.";
        hasError = true;
    }
    if (!end) {
        formErrorReserveEndTime.textContent = "End time required.";
        hasError = true;
    }
    if (start >= end) {
        formErrorReserveEndTime.textContent = "End time must be later.";
        hasError = true;
    }
    if (hasError) return;

    try {
        const res = await fetch(`${API}/room-reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            room_id: roomId,
            room_name: roomName,
            user_id: userId,
            user_name: userName,
            date,
            start_time: start,
            end_time: end,
            subject_id: subject,
            year_section_id: yearSection,
            sem_id: semesterData.sem_id
            })
        });

        const data = await res.json();
        if (res.ok) {
            showFeedback("success", "Success", data.message || "Room reserved")
            reserveRoomForm.reset();
            reserveRoomModal.style.display = "none";
        } else {
            showFeedback("error", "Failed", data.message || "Failed to add reservation.");
        }
    } catch(err) {
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    }

});

reserveRoomModal.addEventListener("click", (e) => {
    if(e.target === reserveRoomModal){
        reserveRoomModal.style.display = "none";
    }
});

fetchTimetable();