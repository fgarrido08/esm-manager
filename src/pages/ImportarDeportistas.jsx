import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { agregarDeportista } from '../firebase/deportistas';

export default function ImportarDeportistas() {
  const [archivo, setArchivo] = useState(null);
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState('');
  const [exitoso, setExitoso] = useState(false);
  const [resumen, setResumen] = useState({ total: 0, mixtas: 0, damas: 0, varones: 0 });
  
  const navigate = useNavigate();

  const handleArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArchivo(file);
    setError('');
    setExitoso(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Procesar las 3 hojas: MIXTAS, DAMAS, VARONES
        const todosLosDeportistas = [];
        const hojas = ['MIXTAS', 'DAMAS', 'VARONES'];
        let contador = { mixtas: 0, damas: 0, varones: 0 };

        hojas.forEach(hoja => {
          if (wb.SheetNames.includes(hoja)) {
            const ws = wb.Sheets[hoja];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            // Saltar las primeras filas (encabezados del club) y empezar desde la fila de datos
            // Los datos empiezan después de las filas vacías o de encabezado
            let startIndex = 0;
            for (let i = 0; i < data.length; i++) {
              if (data[i] && data[i].length > 0 && data[i][0] && !isNaN(data[i][0])) {
                startIndex = i;
                break;
              }
            }

            // Procesar filas
            for (let i = startIndex; i < data.length; i++) {
              const fila = data[i];
              
              // Verificar que tenga al menos RUT o nombre (fila válida)
              if (fila && (fila[3] || fila[2])) {
                const deportista = {
                  numero: fila[0] || '',
                  primerApellido: fila[1] || '',
                  segundoApellido: fila[2] || '',
                  nombre: fila[3] || '',
                  rut: fila[4] || '',
                  club: fila[5] || 'ESM',
                  diaNacimiento: fila[6] || '',
                  mesNacimiento: fila[7] || '',
                  anioNacimiento: fila[8] || '',
                  serie: fila[9] || '',
                  serieRefuerza: fila[11] || '',
                  nacionalidad: fila[13] || 'Chilena'
                };

                // Solo agregar si tiene nombre y apellido
                if (deportista.nombre && deportista.primerApellido) {
                  todosLosDeportistas.push({
                    ...deportista,
                    hoja: hoja.toLowerCase()
                  });
                  
                  if (hoja === 'MIXTAS') contador.mixtas++;
                  else if (hoja === 'DAMAS') contador.damas++;
                  else if (hoja === 'VARONES') contador.varones++;
                }
              }
            }
          }
        });

        console.log("Deportistas encontrados:", todosLosDeportistas.length);
        console.log("Resumen:", contador);
        setDatos(todosLosDeportistas);
        setResumen({ 
          total: todosLosDeportistas.length, 
          mixtas: contador.mixtas, 
          damas: contador.damas, 
          varones: contador.varones 
        });
      } catch (err) {
        setError("Error al leer el archivo: " + err.message);
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportar = async () => {
    if (datos.length === 0) return;
    
    setCargando(true);
    setProgreso(0);
    setError('');

    try {
      let exitosos = 0;
      let errores = 0;

      for (let i = 0; i < datos.length; i++) {
        const d = datos[i];
        
        try {
          // Construir fecha de nacimiento
          let fechaNacimiento = '';
          if (d.anioNacimiento && d.mesNacimiento && d.diaNacimiento) {
            const mes = String(d.mesNacimiento).padStart(2, '0');
            const dia = String(d.diaNacimiento).padStart(2, '0');
            fechaNacimiento = `${d.anioNacimiento}-${mes}-${dia}`;
          }

          // Separar nombre en primer y segundo nombre
          const partesNombre = d.nombre.trim().split(' ');
          const primerNombre = partesNombre[0] || '';
          const segundoNombre = partesNombre.slice(1).join(' ') || '';

          // Mapear categoría (quitar espacios y normalizar)
          let categoria = d.serie ? d.serie.trim().toUpperCase() : '';
          // Manejar variaciones como "sub 17" vs "SUB 17"
          categoria = categoria.replace(/\s+/g, ' ');

          const deportista = {
            primerNombre: primerNombre,
            segundoNombre: segundoNombre,
            apellidoPaterno: d.primerApellido,
            apellidoMaterno: d.segundoApellido,
            rut: d.rut,
            fechaNacimiento: fechaNacimiento,
            sexo: d.hoja === 'varones' ? 'Masculino' : 'Femenino',
            categoria: categoria,
            apoderadoNombre: '',
            apoderadoTelefono: '',
            apoderadoEmail: '',
            grupoSanguineo: 'O+',
            alergias: 'Ninguna'
          };

          // Validar que tenga datos mínimos
          if (deportista.primerNombre && deportista.apellidoPaterno && deportista.rut) {
            await agregarDeportista(deportista);
            exitosos++;
          }

          setProgreso(Math.round(((i + 1) / datos.length) * 100));
        } catch (err) {
          console.error(`Error importando ${d.nombre}:`, err);
          errores++;
        }
      }

      setExitoso(true);
      alert(`✅ Importación completada:\n\n✔️ Exitosos: ${exitosos}\n❌ Errores: ${errores}`);
    } catch (err) {
      setError("Error al importar: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">📥 Importar Deportistas</h2>
          <p className="text-gray-600 mt-1">Carga masiva desde Excel ESM</p>
        </div>
        <button 
          onClick={() => navigate('/deportistas')}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
        >
          ← Volver
        </button>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2">📋 Instrucciones</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>El Excel debe tener las hojas: <b>MIXTAS, DAMAS, VARONES</b></li>
          <li>Columnas requeridas: <b>Primer Apellido, Segundo Apellido, Nombre, RUT, Serie</b></li>
          <li>Fecha de nacimiento en columnas separadas: <b>Día, Mes, Año</b></li>
          <li>Selecciona el archivo y haz clic en "Vista Previa"</li>
          <li>Revisa los datos y luego haz clic en "Importar Deportistas"</li>
        </ol>
      </div>

      {/* Selector de archivo */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold text-gray-700 mb-4">1. Selecciona el archivo Excel</h3>
        <input 
          type="file" 
          accept=".xlsx,.xls"
          onChange={handleArchivo}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
        />
        
        {archivo && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Archivo: <b>{archivo.name}</b>
            </p>
            <div className="grid grid-cols-4 gap-4 mt-3">
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-2xl font-bold text-blue-600">{resumen.total}</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-gray-500">Mixtas</p>
                <p className="text-2xl font-bold text-purple-600">{resumen.mixtas}</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-gray-500">Damas</p>
                <p className="text-2xl font-bold text-pink-600">{resumen.damas}</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="text-xs text-gray-500">Varones</p>
                <p className="text-2xl font-bold text-indigo-600">{resumen.varones}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vista previa */}
      {datos.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-700">2. Vista previa (primeros 10 registros)</h3>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 border-b sticky top-0">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Apellido</th>
                  <th className="p-3">RUT</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Sexo</th>
                  <th className="p-3">Hoja</th>
                </tr>
              </thead>
              <tbody>
                {datos.slice(0, 10).map((fila, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3">{fila.nombre}</td>
                    <td className="p-3">{fila.primerApellido} {fila.segundoApellido}</td>
                    <td className="p-3 font-mono text-xs">{fila.rut}</td>
                    <td className="p-3">{fila.serie}</td>
                    <td className="p-3">{fila.hoja === 'varones' ? 'M' : 'F'}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        fila.hoja === 'mixtas' ? 'bg-purple-100 text-purple-800' :
                        fila.hoja === 'damas' ? 'bg-pink-100 text-pink-800' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {fila.hoja}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botón de importar */}
      {datos.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-semibold text-gray-700 mb-4">3. Importar datos</h3>
          
          {cargando && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-700 mb-1">
                <span>Progreso</span>
                <span>{progreso}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${progreso}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Importando deportista {Math.round((progreso * datos.length) / 100)} de {datos.length}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <button 
            onClick={handleImportar}
            disabled={cargando}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
              cargando 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {cargando ? ` Importando... ${progreso}%` : '🚀 Importar Todos los Deportistas'}
          </button>

          <p className="text-xs text-gray-500 mt-3 text-center">
            Esto creará automáticamente todos los deportistas en la base de datos
          </p>
        </div>
      )}

      {exitoso && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-2xl font-bold text-green-800 mb-2">✅ ¡Importación exitosa!</p>
          <p className="text-sm text-green-700 mb-4">
            Se procesaron {resumen.total} deportistas. Ya puedes verlos en el módulo.
          </p>
          <button 
            onClick={() => navigate('/deportistas')}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-800 font-medium"
          >
            Ver Deportistas →
          </button>
        </div>
      )}
    </div>
  );
}