function addPartial(divID) {
    const el = document.getElementById(divID);
    el.classList.add('fade');
    el.style.display = 'block'; // Sofort anzeigen
    setTimeout(() => {
        el.classList.add('show'); // Mit Verzögerung opacity hochfahren
    }, 10); // minimaler Delay für Transition
}

function removePartial(divID) {
    const el = document.getElementById(divID);
    el.classList.remove('show'); // Startet die Opacity-Transition

    // Nach der Transition (500ms), display:none setzen
    setTimeout(() => {
        el.style.display = 'none';
    }, 500);
}


function calculateDuration(day, hours, minutes) {
    const now = new Date();
    const end = new Date(`${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

    const duration = end - now;

    if (duration < 0) {
        return "Bereits beendet";
    }

    const d = Math.floor(duration / (1000 * 60 * 60 * 24));
    const h = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

     const pluralize = (value, singular, plural) =>
        value === 1 ? `1 ${singular}` : `${value} ${plural}`;

    if (d > 0) {
        return `${pluralize(d, "Tag", "Tage")} und ${pluralize(h, "Stunde", "Stunden")}`;
    } else if (h > 0) {
        return pluralize(h, "Stunde", "Stunden");
    } else {
        return pluralize(m, "Minute", "Minuten");
    }
}
