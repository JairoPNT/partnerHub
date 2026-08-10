const fs = require('fs');
const path = require('path');

const file = path.join('d:', 'Proyectos multi agentes', 'PartnerHub', 'app', 'web', 'components', 'master-site-management-view.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Replace state & constants
content = content.replace(
  /const \[activeEcosystem, setActiveEcosystem\] = useState<"PRODUCT" \| "BUSINESS" \| "PERSONAL_BRAND">\("PRODUCT"\);\s*\/\/ Configuración fija del sitio maestro \(Ecosistema Producto\)\s*const MASTER_SITE_ID = "ganomaster";\s*const MASTER_DOMAIN = "ganomaster\.pro";/,
  `const [activeEcosystem, setActiveEcosystem] = useState<EcosystemType>("PRODUCT");

  // Contrato Canónico (AGR-20260810-001)
  const activeContract = React.useMemo(() => {
    switch (activeEcosystem) {
      case "BUSINESS":
        return {
          id: "ganomaster-business",
          domain: "business.ganomaster.pro",
          type: "BUSINESS" as EcosystemType
        };
      case "PERSONAL_BRAND":
        return {
          id: "ganomaster-personal-brand",
          domain: "brand.ganomaster.pro",
          type: "PERSONAL_BRAND" as EcosystemType
        };
      case "PRODUCT":
      default:
        return {
          id: "ganomaster",
          domain: "product.ganomaster.pro",
          type: "PRODUCT" as EcosystemType
        };
    }
  }, [activeEcosystem]);

  const MASTER_SITE_ID = activeContract.id;
  const MASTER_DOMAIN = activeContract.domain;
  const MASTER_ECOSYSTEM = activeContract.type;`
);

// 2. Replace useEffect
content = content.replace(
  /useEffect\(\(\) => \{\s*fetchMasterConfig\(\);\s*fetchClientSites\(\);\s*\}, \[\]\);/,
  `useEffect(() => {
    setForm(INITIAL_MASTER_FORM);
    setGeneratedAt(null);
    setPublishedAt(null);
    setGenerationOutput(null);
    setMasterVerification(null);
    setPublicationState("PENDING");
    setMasterSuccessMessage(null);
    setMasterErrorMessage(null);

    fetchMasterConfig();
    fetchClientSites();
  }, [activeEcosystem]);`
);

// 3. Update generation payload to include ecosystemType
content = content.replace(
  /const payload = \{\s*site: \{/,
  `const payload = {
      ecosystemType: MASTER_ECOSYSTEM,
      site: {`
);

// 4. Update string references of "ganomaster.pro" to MASTER_DOMAIN or literal replacements
content = content.replace(/Exclusión obligatoria de ganomaster y ganomaster\.pro/, 'Exclusión obligatoria del sitio maestro actual');
content = content.replace(/con payload fijo ganomaster \/ ganomaster\.pro/, 'con payload fijo del ecosistema');
content = content.replace(/setMasterSuccessMessage\("Paquete estático maestro generado localmente\. Ahora puedes publicarlo en ganomaster\.pro\."\);/, 'setMasterSuccessMessage(`Paquete estático maestro generado localmente. Ahora puedes publicarlo en ${MASTER_DOMAIN}.`);');
content = content.replace(/\/\/ 2\. Publicar en ganomaster\.pro \(POST \/api\/internal\/product-pages\/publish\)/, '// 2. Publicar (POST /api/internal/product-pages/publish)');
content = content.replace(/throw new Error\(data\.error \|\| "No se pudo publicar en ganomaster\.pro\."\);/, 'throw new Error(data.error || `No se pudo publicar en ${MASTER_DOMAIN}.`);');
content = content.replace(/setMasterSuccessMessage\("Vista previa publicada y verificada en ganomaster\.pro\."\);/, 'setMasterSuccessMessage(`Vista previa publicada y verificada en ${MASTER_DOMAIN}.`);');
content = content.replace(/setMasterErrorMessage\("Vista previa publicada, pero la verificación en ganomaster\.pro requiere revisión\."\);/, 'setMasterErrorMessage(`Vista previa publicada, pero la verificación en ${MASTER_DOMAIN} requiere revisión.`);');
content = content.replace(/setMasterErrorMessage\(err instanceof Error \? err\.message : "Error al publicar en ganomaster\.pro\."\);/, 'setMasterErrorMessage(err instanceof Error ? err.message : `Error al publicar en ${MASTER_DOMAIN}.`);');
content = content.replace(/return "Publicar en ganomaster\.pro";/, 'return `Publicar en ${MASTER_DOMAIN}`;');
content = content.replace(/1\. Identificación y Datos de Marca \(\`ganomaster\`\)/, '1. Identificación y Datos de Marca (`${MASTER_SITE_ID}`)');
content = content.replace(/Metadatos para la versión maestra ganomaster\.pro\./, 'Metadatos para la versión maestra {MASTER_DOMAIN}.');
content = content.replace(/He revisado y aprobado la versión actual de ganomaster\.pro/, 'He revisado y aprobado la versión actual de {MASTER_DOMAIN}');
content = content.replace(/La replicación masiva en clientes estará habilitada únicamente cuando la versión publicada en <code className="font-mono">ganomaster\.pro<\/code> esté totalmente aprobada\./, 'La replicación masiva en clientes estará habilitada únicamente cuando la versión publicada en <code className="font-mono">{MASTER_DOMAIN}</code> esté totalmente aprobada.');
content = content.replace(/<span>La replicación masiva está deshabilitada hasta que apruebes la versión publicada en ganomaster\.pro\.<\/span>/, '<span>La replicación masiva está deshabilitada hasta que apruebes la versión publicada en {MASTER_DOMAIN}.</span>');
content = content.replace(/Estás a punto de replicar la plantilla maestra aprobada <strong>ganomaster\.pro<\/strong> en/, 'Estás a punto de replicar la plantilla maestra aprobada <strong>{MASTER_DOMAIN}</strong> en');
content = content.replace(/Origen: <code className="font-mono font-bold">ganomaster\.pro<\/code>/, 'Origen: <code className="font-mono font-bold">{MASTER_DOMAIN}</code>');

// 5. Remove unused Lock import
content = content.replace(/,\s*Lock\s*\} from "lucide-react";/, '\n} from "lucide-react";');

fs.writeFileSync(file, content, 'utf8');
console.log('Replacements completed.');
