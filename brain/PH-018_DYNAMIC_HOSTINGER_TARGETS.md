# PH-018: Destinos Hostinger dinamicos por dominio

## Decision

PartnerHub no debe requerir editar variables de EasyPanel cada vez que se registra un empresario nuevo.

Para el plan Hostinger actual, se configura una sola vez:

```env
HOSTINGER_SFTP_REMOTE_ROOT_TEMPLATE=/home/u658137804/domains/{domain}/public_html
```

El dominio se guarda en la configuracion individual del sitio y el publicador calcula la ruta automaticamente.

## Compatibilidad

`HOSTINGER_SFTP_REMOTE_ROOTS_JSON` se conserva temporalmente para `ganomaster`, `dorian-higuita`, `jairo-pinto-test` y excepciones. Cuando todos los sitios tengan `site.domain`, se puede retirar esa variable.

## Requisito de interfaz

El alta y edicion administrativa deben incluir `Dominio de publicacion`. El operador lo registra una vez; no vuelve a tocar EasyPanel.
