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
