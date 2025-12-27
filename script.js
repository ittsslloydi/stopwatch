let stopwatchRunning = false;
let stopwatchTime = 0;
let stopwatchInterval = null;
let lapTimes = [];

let timerRunning = false;
let timerTime = 0;
let timerInterval = null;
let timerDuration = 0;

let alarms = [];
let currentEditingAlarmId = null;
let currentTime = new Date();

const STORAGE_KEYS = {
    ALARMS: 'clockAppAlarms',
    LAPS: 'clockAppLaps',
    DARK_MODE: 'clockAppDarkMode'
};

// ===========================
// Floating Notification System
// ===========================

function showNotification(message, type = 'info', duration = 3000) {
    const notificationContainer = document.getElementById('notificationContainer') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `floating-notification notification-${type}`;
    notification.textContent = message;
    notification.style.animation = 'notificationSlideIn 0.3s ease-out';
    
    notificationContainer.appendChild(notification);
    
    // Auto-dismiss
    const timeout = setTimeout(() => {
        notification.style.animation = 'notificationSlideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, duration);
    
    // Manual close on click
    notification.addEventListener('click', () => {
        clearTimeout(timeout);
        notification.style.animation = 'notificationSlideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    });
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

function showSuccessNotification(message) {
    showNotification(message, 'success', 2500);
}

function showErrorNotification(message) {
    showNotification(message, 'error', 3500);
}

function showWarningNotification(message) {
    showNotification(message, 'warning', 3000);
}

function showConfirmation(message, onConfirm, onCancel = null) {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.style.animation = 'fadeIn 0.2s ease-out';
    
    const backdrop = document.createElement('div');
    backdrop.className = 'confirmation-backdrop';
    
    const content = document.createElement('div');
    content.className = 'confirmation-content';
    content.style.animation = 'slideUp 0.3s ease-out';
    
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.className = 'confirmation-message';
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'confirmation-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'confirmation-btn cancel-btn';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Delete';
    confirmBtn.className = 'confirmation-btn confirm-btn';
    
    cancelBtn.addEventListener('click', () => {
        modal.style.animation = 'fadeOut 0.2s ease-in';
        setTimeout(() => modal.remove(), 200);
        if (onCancel) onCancel();
    });
    
    confirmBtn.addEventListener('click', () => {
        modal.style.animation = 'fadeOut 0.2s ease-in';
        setTimeout(() => modal.remove(), 200);
        onConfirm();
    });
    
    backdrop.addEventListener('click', () => {
        modal.style.animation = 'fadeOut 0.2s ease-in';
        setTimeout(() => modal.remove(), 200);
        if (onCancel) onCancel();
    });
    
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    content.appendChild(messageEl);
    content.appendChild(buttonsContainer);
    modal.appendChild(backdrop);
    modal.appendChild(content);
    
    document.body.appendChild(modal);
}

// ===========================
// Page Navigation
// ===========================

function navigateTo(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    document.getElementById(pageId).classList.add('active');
    
    // Initialize page-specific content
    if (pageId === 'alarm') {
        updateCurrentTime();
        renderAlarms();
        startCurrentTimeUpdate();
    }
}

// Feature card navigation
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('click', () => {
        const feature = card.dataset.feature;
        if (feature === 'stopwatch') {
            navigateTo('stopwatch');
            resetStopwatch();
        } else if (feature === 'timer') {
            navigateTo('timer');
            showTimerSelection();
        } else if (feature === 'alarm') {
            navigateTo('alarm');
        }
    });
});

// Back buttons
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.backTo;
        if (stopwatchRunning) stopStopwatch();
        if (timerRunning) pauseTimer();
        navigateTo(target);
    });
});

// ===========================
// Stopwatch Functions
// ===========================

function formatStopwatchTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function updateStopwatchDisplay() {
    document.getElementById('stopwatchDisplay').textContent = formatStopwatchTime(stopwatchTime);
}

function startStopwatch() {
    if (stopwatchRunning) return;
    stopwatchRunning = true;
    document.getElementById('stopwatchStart').textContent = 'Pause';
    document.getElementById('stopwatchLap').disabled = false;
    
    const startTime = Date.now() - stopwatchTime;
    
    stopwatchInterval = setInterval(() => {
        stopwatchTime = Date.now() - startTime;
        updateStopwatchDisplay();
    }, 10);
}

function stopStopwatch() {
    if (!stopwatchRunning) return;
    stopwatchRunning = false;
    document.getElementById('stopwatchStart').textContent = 'Resume';
    clearInterval(stopwatchInterval);
}

function recordLap() {
    if (!stopwatchRunning) return;
    
    const lapTime = stopwatchTime;
    lapTimes.push(lapTime);
    
    const lapsList = document.getElementById('lapsList');
    const lapItem = document.createElement('div');
    lapItem.className = 'lap-item';
    
    const lapNumber = lapTimes.length;
    lapItem.innerHTML = `
        <span class="lap-number">Lap ${lapNumber}</span>
        <span class="lap-time">${formatStopwatchTime(lapTime)}</span>
    `;
    
    lapsList.insertBefore(lapItem, lapsList.firstChild);
    saveLaps();
}

function resetStopwatch() {
    stopStopwatch();
    stopwatchTime = 0;
    lapTimes = [];
    updateStopwatchDisplay();
    document.getElementById('stopwatchStart').textContent = 'Start';
    document.getElementById('stopwatchLap').disabled = true;
    document.getElementById('lapsList').innerHTML = '';
    saveLaps();
}

function saveLaps() {
    localStorage.setItem(STORAGE_KEYS.LAPS, JSON.stringify(lapTimes));
}

function loadLaps() {
    const saved = localStorage.getItem(STORAGE_KEYS.LAPS);
    if (saved) {
        lapTimes = JSON.parse(saved);
        const lapsList = document.getElementById('lapsList');
        lapTimes.forEach((lapTime, index) => {
            const lapItem = document.createElement('div');
            lapItem.className = 'lap-item';
            lapItem.innerHTML = `
                <span class="lap-number">Lap ${index + 1}</span>
                <span class="lap-time">${formatStopwatchTime(lapTime)}</span>
            `;
            lapsList.appendChild(lapItem);
        });
    }
}

// Stopwatch event listeners
document.getElementById('stopwatchStart').addEventListener('click', () => {
    if (stopwatchRunning) {
        stopStopwatch();
    } else {
        startStopwatch();
    }
});

document.getElementById('stopwatchLap').addEventListener('click', recordLap);
document.getElementById('stopwatchReset').addEventListener('click', resetStopwatch);

// ===========================
// Timer Functions
// ===========================

function formatTimerTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTimerDisplay() {
    document.getElementById('timerDisplay').textContent = formatTimerTime(timerTime);
}

function showTimerSelection() {
    document.getElementById('timerMainView').classList.add('hidden');
    document.getElementById('timerSelectionView').classList.remove('hidden');
    timerTime = 0;
    timerDuration = 0;
    updateTimerDisplay();
}

function showTimerMain() {
    document.getElementById('timerMainView').classList.remove('hidden');
    document.getElementById('timerSelectionView').classList.add('hidden');
    updateTimerDisplay();
}

function setTimer(seconds) {
    timerDuration = seconds;
    timerTime = seconds;
    updateTimerDisplay();
    showTimerMain();
}

function startTimer() {
    if (timerRunning || timerTime <= 0) return;
    timerRunning = true;
    document.getElementById('timerStart').classList.add('hidden');
    document.getElementById('timerPause').classList.remove('hidden');
    
    const startTime = Date.now();
    const initialTime = timerTime;
    
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timerTime = Math.max(0, initialTime - elapsed);
        updateTimerDisplay();
        
        if (timerTime <= 0) {
            pauseTimer();
            timerFinished();
        }
    }, 100);
}

function pauseTimer() {
    if (!timerRunning) return;
    timerRunning = false;
    clearInterval(timerInterval);
    document.getElementById('timerStart').classList.remove('hidden');
    document.getElementById('timerPause').classList.add('hidden');
}

function resetTimer() {
    pauseTimer();
    showTimerSelection();
}

function timerFinished() {
    // Play sound or notification
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj==');
    audio.play().catch(() => {});
    
    showSuccessNotification('⏱️ Timer finished!');
}

function setCustomTimer() {
    const hours = parseInt(document.getElementById('customHours').value || 0);
    const minutes = parseInt(document.getElementById('customMinutes').value || 0);
    const seconds = parseInt(document.getElementById('customSeconds').value || 0);
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    if (totalSeconds <= 0) {
        showErrorNotification('⚠️ Please set a valid time');
        return;
    }
    
    setTimer(totalSeconds);
}

// Timer preset cards
document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
        const seconds = parseInt(card.dataset.seconds);
        setTimer(seconds);
    });
});

document.getElementById('timerStart').addEventListener('click', startTimer);
document.getElementById('timerPause').addEventListener('click', pauseTimer);
document.getElementById('timerReset').addEventListener('click', resetTimer);
document.getElementById('timerEditBtn').addEventListener('click', showTimerSelection);
document.getElementById('timerConfirmBtn').addEventListener('click', setCustomTimer);

// ===========================
// Alarm Functions
// ===========================

function formatTime12Hour(date) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Convert to 12-hour format
    if (hours === 0) {
        hours = 12;
    } else if (hours > 12) {
        hours = hours - 12;
    }
    
    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function updateCurrentTime() {
    currentTime = new Date();
    const timeStr = formatTime12Hour(currentTime);
    const meridiem = currentTime.getHours() >= 12 ? 'PM' : 'AM';
    
    const timeElement = document.getElementById('currentTime');
    const meridiemElement = document.getElementById('meridiem');
    
    if (timeElement) timeElement.textContent = timeStr;
    if (meridiemElement) meridiemElement.textContent = meridiem;
}

function startCurrentTimeUpdate() {
    setInterval(updateCurrentTime, 1000);
}

function createAlarmId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function convertTo24Hour(hours, meridiem) {
    if (meridiem === 'PM' && hours !== 12) {
        return hours + 12;
    }
    if (meridiem === 'AM' && hours === 12) {
        return 0;
    }
    return hours;
}

function convert24ToMeridiem(hours) {
    if (hours === 0) return { hours: 12, meridiem: 'AM' };
    if (hours < 12) return { hours, meridiem: 'AM' };
    if (hours === 12) return { hours, meridiem: 'PM' };
    return { hours: hours - 12, meridiem: 'PM' };
}

function updateMeridiemDisplay() {
    const meridiem = document.getElementById('alarmMeridiem');
    const hours = parseInt(document.getElementById('alarmHours').value) || 0;
    const converted = convert24ToMeridiem(hours);
    meridiem.textContent = converted.meridiem;
}

function openAddAlarmModal() {
    currentEditingAlarmId = null;
    document.getElementById('modalTitle').textContent = 'Add Alarm';
    document.getElementById('alarmHours').value = '09';
    document.getElementById('alarmMinutes').value = '00';
    document.getElementById('alarmMeridiem').textContent = 'AM';
    document.getElementById('alarmLabel').value = '';
    document.getElementById('alarmChimes').value = 'chimes';
    document.getElementById('alarmSnooze').value = '10';
    document.getElementById('alarmModal').classList.remove('hidden');
    
    document.querySelectorAll('.day-checkbox input').forEach(checkbox => {
        checkbox.checked = false;
    });
    [1, 2, 3, 4, 5].forEach(day => {
        const cb = document.querySelector(`.day-checkbox input[value="${day}"]`);
        if (cb) cb.checked = true;
    });
    updateDayCheckboxHighlight();
}

function openEditAlarmModal(alarmId) {
    currentEditingAlarmId = alarmId;
    const alarm = alarms.find(a => a.id === alarmId);
    
    document.getElementById('modalTitle').textContent = 'Edit Alarm';
    
    // Parse time (HH:mm format)
    const [hours24, minutes] = alarm.time.split(':').map(Number);
    const converted = convert24ToMeridiem(hours24);
    
    document.getElementById('alarmHours').value = String(converted.hours).padStart(2, '0');
    document.getElementById('alarmMinutes').value = String(minutes).padStart(2, '0');
    document.getElementById('alarmMeridiem').textContent = converted.meridiem;
    document.getElementById('alarmLabel').value = alarm.label;
    document.getElementById('alarmChimes').value = alarm.chimes || 'chimes';
    document.getElementById('alarmSnooze').value = alarm.snooze || '10';
    document.getElementById('alarmModal').classList.remove('hidden');
    
    document.querySelectorAll('.day-checkbox input').forEach(checkbox => {
        checkbox.checked = false;
    });
    alarm.days.forEach(day => {
        const cb = document.querySelector(`.day-checkbox input[value="${day}"]`);
        if (cb) cb.checked = true;
    });
    updateDayCheckboxHighlight();
}

// Highlight day when checked using .selected class
function updateDayCheckboxHighlight() {
    document.querySelectorAll('.day-checkbox input').forEach(cb => {
        if (cb.checked && cb.nextElementSibling) {
            cb.nextElementSibling.classList.add('selected');
        } else if (cb.nextElementSibling) {
            cb.nextElementSibling.classList.remove('selected');
        }
    });
}

// Attach event listeners for all day-checkboxes
function attachDayCheckboxListeners() {
    document.querySelectorAll('.day-checkbox input').forEach(cb => {
        cb.removeEventListener('change', updateDayCheckboxHighlight);
        cb.addEventListener('change', updateDayCheckboxHighlight);
    });
}

// Attach listeners on DOMContentLoaded and after modal open
document.addEventListener('DOMContentLoaded', () => {
    attachDayCheckboxListeners();
    updateDayCheckboxHighlight();
});

// Patch openAddAlarmModal and openEditAlarmModal to always update listeners and highlight
const _openAddAlarmModal = openAddAlarmModal;
openAddAlarmModal = function() {
    _openAddAlarmModal.apply(this, arguments);
    attachDayCheckboxListeners();
    updateDayCheckboxHighlight();
};
const _openEditAlarmModal = openEditAlarmModal;
openEditAlarmModal = function() {
    _openEditAlarmModal.apply(this, arguments);
    attachDayCheckboxListeners();
    updateDayCheckboxHighlight();
};


function closeAlarmModal() {
    document.getElementById('alarmModal').classList.add('hidden');
    currentEditingAlarmId = null;
}

function saveAlarm() {
    const hours = parseInt(document.getElementById('alarmHours').value) || 0;
    const minutes = parseInt(document.getElementById('alarmMinutes').value) || 0;
    const meridiem = document.getElementById('alarmMeridiem').textContent;
    const label = document.getElementById('alarmLabel').value || 'Alarm';
    const chimes = document.getElementById('alarmChimes').value;
    const snooze = document.getElementById('alarmSnooze').value;
    const selectedDays = Array.from(document.querySelectorAll('.day-checkbox input:checked'))
        .map(cb => parseInt(cb.value));
    
    // Convert to 24-hour format
    const hours24 = convertTo24Hour(hours, meridiem);
    const time = `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    if (!hours && !minutes) {
        showErrorNotification('⚠️ Please select a time');
        return;
    }
    
    if (selectedDays.length === 0) {
        showErrorNotification('⚠️ Please select at least one day');
        return;
    }
    
    if (currentEditingAlarmId) {
        // Edit existing alarm
        const alarm = alarms.find(a => a.id === currentEditingAlarmId);
        alarm.time = time;
        alarm.label = label;
        alarm.days = selectedDays;
        alarm.chimes = chimes;
        alarm.snooze = snooze;
        showSuccessNotification('✅ Alarm updated');
    } else {
        // Create new alarm
        const alarm = {
            id: createAlarmId(),
            time: time,
            label: label,
            days: selectedDays,
            chimes: chimes,
            snooze: snooze,
            enabled: true
        };
        alarms.push(alarm);
        showSuccessNotification('✅ Alarm created');
    }
    
    saveAlarms();
    renderAlarms();
    closeAlarmModal();
}

function deleteAlarm(alarmId) {
    showConfirmation(
        '🗑️ Delete this alarm?',
        () => {
            alarms = alarms.filter(a => a.id !== alarmId);
            saveAlarms();
            renderAlarms();
            showSuccessNotification('✅ Alarm deleted');
        }
    );
}

function toggleAlarm(alarmId) {
    const alarm = alarms.find(a => a.id === alarmId);
    if (alarm) {
        alarm.enabled = !alarm.enabled;
        saveAlarms();
        renderAlarms();
    }
}

function renderAlarms() {
    const alarmsList = document.getElementById('alarmsList');
    const emptyState = document.getElementById('emptyAlarms');
    
    alarmsList.innerHTML = '';
    
    if (alarms.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Sort alarms by time
    const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time));
    
    sorted.forEach(alarm => {
        const alarmItem = document.createElement('div');
        alarmItem.className = 'alarm-item';
        
        const dayNames = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
        const daysText = alarm.days.map(d => dayNames[d]).join('');
        
        // Convert time to 12-hour format for display
        const [hours24, minutes] = alarm.time.split(':').map(Number);
        const converted = convert24ToMeridiem(hours24);
        const displayTime = `${String(converted.hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${converted.meridiem}`;
        
        alarmItem.innerHTML = `
            <div class="alarm-info">
                <div class="alarm-time">${displayTime}</div>
                <div class="alarm-label">${alarm.label}</div>
                <div class="alarm-days">${daysText}</div>
            </div>
            <div class="alarm-controls">
                <button class="alarm-toggle ${alarm.enabled ? 'active' : ''}" data-id="${alarm.id}"></button>
                <button class="delete-alarm-btn" data-id="${alarm.id}" title="Delete">✕</button>
            </div>
        `;
        
        alarmsList.appendChild(alarmItem);
    });
    
    // Add event listeners
    document.querySelectorAll('.alarm-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const alarmId = e.currentTarget.dataset.id;
            toggleAlarm(alarmId);
        });
    });
    
    document.querySelectorAll('.delete-alarm-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const alarmId = e.currentTarget.dataset.id;
            deleteAlarm(alarmId);
        });
    });
    
    // Edit on click
    document.querySelectorAll('.alarm-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.alarm-controls')) return;
            const alarmId = item.querySelector('.alarm-toggle').dataset.id;
            openEditAlarmModal(alarmId);
        });
    });
}

function saveAlarms() {
    localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms));
}

function loadAlarms() {
    const saved = localStorage.getItem(STORAGE_KEYS.ALARMS);
    if (saved) {
        alarms = JSON.parse(saved);
    }
}

// Alarm modal event listeners
document.getElementById('addAlarmBtn').addEventListener('click', openAddAlarmModal);
document.getElementById('closeModalBtn').addEventListener('click', closeAlarmModal);
document.getElementById('cancelAlarmBtn').addEventListener('click', closeAlarmModal);
document.getElementById('saveAlarmBtn').addEventListener('click', saveAlarm);

// Time spinner functionality
document.querySelectorAll('.spinner-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const spinnerType = e.currentTarget.dataset.spinnertype;
        const isUpBtn = e.currentTarget.classList.contains('up-btn');
        
        if (spinnerType === 'hour') {
            const hoursInput = document.getElementById('alarmHours');
            let hours = parseInt(hoursInput.value) || 0;
            hours = isUpBtn ? (hours + 1) % 12 : (hours - 1 + 12) % 12;
            if (hours === 0) hours = 12;
            hoursInput.value = String(hours).padStart(2, '0');
            updateMeridiemDisplay();
        } else if (spinnerType === 'minute') {
            const minutesInput = document.getElementById('alarmMinutes');
            let minutes = parseInt(minutesInput.value) || 0;
            minutes = isUpBtn ? (minutes + 1) % 60 : (minutes - 1 + 60) % 60;
            minutesInput.value = String(minutes).padStart(2, '0');
        } else if (spinnerType === 'meridiem') {
            const meridiemSpan = document.getElementById('alarmMeridiem');
            meridiemSpan.textContent = meridiemSpan.textContent === 'AM' ? 'PM' : 'AM';
        }
    });
});

// Allow direct input for hours and minutes
document.getElementById('alarmHours').addEventListener('change', function() {
    let hours = parseInt(this.value) || 0;
    if (hours > 12) hours = 12;
    if (hours < 1) hours = 1;
    this.value = String(hours).padStart(2, '0');
    updateMeridiemDisplay();
});

document.getElementById('alarmMinutes').addEventListener('change', function() {
    let minutes = parseInt(this.value) || 0;
    if (minutes > 59) minutes = 59;
    if (minutes < 0) minutes = 0;
    this.value = String(minutes).padStart(2, '0');
});

// Dark mode toggle
document.getElementById('darkModeToggle').addEventListener('click', function(e) {
    e.stopPropagation();
    this.classList.toggle('active');
    const isDarkMode = this.classList.contains('active');
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, isDarkMode);
    
    if (isDarkMode) {
        document.body.style.background = 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)';
    } else {
        document.body.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)';
    }
});

// Modal backdrop close
document.getElementById('alarmModal').addEventListener('click', (e) => {
    if (e.target.id === 'alarmModal') {
        closeAlarmModal();
    }
});

// ===========================
// Initialization
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    loadAlarms();
    loadLaps();
    updateCurrentTime();
    
    // Load dark mode preference
    const isDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
    if (isDarkMode) {
        document.getElementById('darkModeToggle').classList.add('active');
    }
});

// Show dashboard on load
window.addEventListener('load', () => {
    navigateTo('dashboard');
});

// Prevent context menu on long press (optional)
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.feature-card, .preset-card, .alarm-item')) {
        e.preventDefault();
    }
});
