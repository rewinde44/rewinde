import { newStep, migrateResourceFlows, stripLegacyStatuses } from './public/domain.js';
export function seedWorkspace() {
  const resources = [
    { id: 'r-erp', name: 'ERP-System', kind: 'software', owner: 'IT / Finance', description: 'Rechnungserfassung, Buchung und Zahlungsfreigabe.' },
    { id: 'r-mail', name: 'E-Mail-Postfach', kind: 'software', owner: 'Buchhaltung', description: 'Zentraler Rechnungseingang: rechnungen@beispiel.de (Beispiel).' },
    { id: 'r-invoice', name: 'Eingangsrechnung', kind: 'data', owner: 'Lieferant', description: 'Rechnungsnummer, Betrag, Fälligkeit, Lieferant und Beleg als PDF oder strukturiertes Format.' },
    { id: 'r-order', name: 'Bestell- & Lieferdaten', kind: 'data', owner: 'Einkauf', description: 'Bestellpositionen, Wareneingang und vereinbarte Konditionen.' },
    { id: 'r-bank', name: 'Zahlungsbestätigung', kind: 'data', owner: 'Buchhaltung', description: 'Bankreferenz, Valuta, Betrag und Abgleich zum offenen Posten.' },
    { id: 'r-person', name: 'Buchhaltung', kind: 'resource', owner: 'Finance', description: 'Fachliche Bearbeitung und formale Prüfung.' },
    { id: 'r-buyer', name: 'Fachlicher Freigeber', kind: 'resource', owner: 'Fachbereich', description: 'Kennt die Bestellung und bestätigt die erbrachte Leistung.' },
    { id: 'r-banking', name: 'Online-Banking', kind: 'software', owner: 'Treasury', description: 'Zahlungslauf mit Vier-Augen-Freigabe.' }
  ];
  const make = (id, title, kind, description, owner, input, output, minutes, links, potential = 'unchecked', reason = '') => ({ ...newStep(title, kind), id, description, owner, input, output, minutes, links: links.map(([resourceId, direction = 'uses']) => ({ resourceId, direction })), status: description && owner && output ? 'documented' : 'open', assessment: { potential, reason, character: potential === 'high' ? 'rules' : 'judgment' } });
  const steps = [
    make('s-input', 'Rechnung geht ein', 'input', 'Der Lieferant übermittelt eine Rechnung an das zentrale Rechnungspostfach.', 'Lieferant', 'Erbrachte Lieferung oder Leistung', 'Rechnungsbeleg liegt vollständig vor', 0, [['r-mail'], ['r-invoice','output']]),
    make('s-capture', 'Rechnung erfassen', 'activity', 'Rechnungsbeleg im ERP anlegen und dem richtigen Lieferanten zuordnen. Doppelte Belege vor der Erfassung ausschließen.', 'Buchhaltung', 'Rechnungsbeleg aus dem Postfach', 'Rechnung ist im ERP erfasst', 8, [['r-erp'], ['r-invoice','input'], ['r-person']], 'high', 'Wiederkehrende Datenerfassung mit klarer Struktur. Ausnahmen und unleserliche Belege benötigen eine menschliche Prüfung.'),
    make('s-formal', 'Formal prüfen', 'activity', 'Pflichtangaben, Bankverbindung, Rechenwerte und mögliche Dubletten kontrollieren. Abweichungen zur Klärung zurückgeben.', 'Buchhaltung', 'Erfasste Rechnung', 'Formale Richtigkeit ist bestätigt', 6, [['r-erp'], ['r-invoice','input'], ['r-person']], 'high', 'Viele Prüfkriterien sind eindeutig und regelbasiert. Bankänderungen und Ausnahmen bleiben freigabepflichtig.'),
    make('s-factual', 'Sachlich freigeben', 'activity', 'Rechnungspositionen mit Bestellung und tatsächlicher Leistung abgleichen. Die Freigabe erfolgt durch den verantwortlichen Fachbereich.', 'Fachlicher Freigeber', 'Rechnung, Bestellung und Wareneingang', 'Leistung und Betrag sind sachlich freigegeben', 12, [['r-order','input'], ['r-invoice','input'], ['r-buyer']], 'low', 'Die Beurteilung der tatsächlichen Leistung erfordert Kontextwissen und eine verantwortliche Person.'),
    make('s-pay', 'Zahlung ausführen', 'activity', 'Erst nach beiden Prüfungen den Zahlungslauf vorbereiten und im Vier-Augen-Prinzip freigeben.', 'Buchhaltung / Treasury', 'Formal und sachlich freigegebene Rechnung', 'Zahlung ist ausgeführt und bestätigt', 10, [['r-erp'], ['r-banking'], ['r-bank','output']], 'medium', 'Vorbereitung und Abgleich können unterstützt werden. Die Zahlungsfreigabe ist eine bewusste menschliche Entscheidung.'),
    make('s-goal', 'Rechnung ist fehlerfrei bezahlt', 'goal', 'Die richtige Rechnung ist in korrekter Höhe fristgerecht an den richtigen Empfänger bezahlt. Der offene Posten ist ausgeglichen und die Zahlung nachvollziehbar dokumentiert.', 'Leitung Buchhaltung', 'Ausgeführte Zahlung und Bankbestätigung', 'Offener Posten ausgeglichen; Zahlungsnachweis archiviert', 0, [['r-bank','input'], ['r-erp']])
  ];
  const now = new Date().toISOString();
  const simple = (id, title, category, goal, input, owner) => {
    const a = newStep(input, 'input'), b = newStep('Voraussetzungen prüfen'), c = newStep(goal, 'goal');
    c.description = 'Das gewünschte Endergebnis ist der Ausgangspunkt der Rückwärtsanalyse.'; c.owner = owner; c.output = goal;
    return { id, title, category, owner, description: 'Beispielprozess zum Weiterbearbeiten. Ergänze die notwendigen Voraussetzungen vom Ergebnis aus rückwärts.', status: 'draft', updatedAt: now, steps: [a,b,c], edges: [{from:a.id,to:b.id},{from:b.id,to:c.id}] };
  };
  const workspace = { schemaVersion: 1, resources, processes: [
    { id: 'p-invoice', title: 'Rechnungseingang bis Zahlung', description: 'Von der eingegangenen Lieferantenrechnung bis zur korrekten Zahlung. Ein Beispiel für Rückwärtsverkettung mit zwei parallelen Voraussetzungen.', category: 'Finanzen', owner: 'Leitung Buchhaltung', status: 'review', updatedAt: now, steps, edges: [ {from:'s-input',to:'s-capture'}, {from:'s-capture',to:'s-formal'}, {from:'s-capture',to:'s-factual'}, {from:'s-formal',to:'s-pay'}, {from:'s-factual',to:'s-pay'}, {from:'s-pay',to:'s-goal'} ] },
    simple('p-onboarding', 'Mitarbeitende einarbeiten', 'Personal', 'Neue Person ist arbeitsfähig', 'Arbeitsvertrag ist unterschrieben', 'Personalabteilung'),
    simple('p-purchase', 'Beschaffung freigeben', 'Einkauf', 'Bestellung ist freigegeben', 'Bedarf ist bekannt', 'Einkaufsleitung')
  ] };
  migrateResourceFlows(workspace);
  return stripLegacyStatuses(workspace);
}
