// Matriz de roles y permisos (docs/ESPECIFICACION.md y docs/ESPECIFICACION-FASE2.md).
export const ROLES = {
  administrador: 'Administrador',
  tecnico: 'Técnico',
  operario: 'Operario',
};

const TODOS = ['operario', 'tecnico', 'administrador'];

export const PERMISOS = {
  'panel.ver': TODOS,
  'clientes.ver': TODOS,
  'clientes.editar': ['operario', 'administrador'],
  'consolas.ver': TODOS,
  'consolas.recibir': ['operario', 'administrador'],
  'consolas.editar': ['operario', 'administrador'],
  'consolas.fotos': ['operario', 'administrador'],
  'consolas.procedimientos': ['tecnico', 'administrador'],
  'consolas.estado': ['tecnico', 'administrador'],
  // Fase 2 (docs/ESPECIFICACION-FASE2.md)
  'consolas.reparacion': ['tecnico', 'administrador'],
  'consolas.repuestos': ['tecnico', 'administrador'],
  'consolas.interno': ['tecnico', 'administrador'],
  'articulos.ver': TODOS,
  'articulos.editar': ['administrador'],
  'ventas.crear': ['operario', 'administrador'],
  'ventas.ver': ['operario', 'administrador'],
  'usuarios.gestionar': ['administrador'],
  'registros.eliminar': ['administrador'],
  'web.gestionar': ['administrador'],
};

export function tienePermiso(rol, accion) {
  const permitidos = PERMISOS[accion];
  return Boolean(rol && permitidos && permitidos.includes(rol));
}
