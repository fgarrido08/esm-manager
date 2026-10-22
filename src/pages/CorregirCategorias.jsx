import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function CorregirCategorias() {
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const navigate = useNavigate();

  const addLog = (message) => {
    setLogs(prev => [...prev, message]);
    console.log(message);
  };

  const corregirCategorias = async () => {
    setCargando(true);
    setProgreso(0);
    setLogs([]);
    setResultado(null);

    try {
      addLog("🚀 Iniciando corrección de categorías...");
      
      const snapshot = await getDocs(collection(db, 'deportistas'));
      const batch = writeBatch(db);
      let actualizados = 0;
      let errores = 0;
      let total = snapshot.docs.length;

      addLog(`📊 Total de deportistas: ${total}`);

      for (let i = 0; i < snapshot.docs.length; i++) {
        const document = snapshot.docs[i];
        const data = document.data();
        let nuevaCategoria = data.categoria;
        
        // Normalizar categoría
        const cat = data.categoria ? data.categoria.toString().trim().toUpperCase() : '';
        const sexo = data.sexo ? data.sexo.toString().trim().toLowerCase() : '';
        
        try {
          // Mapeo de categorías del Excel al sistema
          if (cat === 'SUB 9' || cat === 'SUB9') {
            nuevaCategoria = 'SUB 9 MIXTO';
          } else if (cat === 'SUB 10' || cat === 'SUB10') {
            nuevaCategoria = 'SUB 10 MIXTO';
          } else if (cat === 'SUB 11' || cat === 'SUB11') {
            nuevaCategoria = 'SUB 11 MIXTO';
          } else if (cat === 'SUB 13' || cat === 'SUB13') {
            nuevaCategoria = sexo === 'femenino' ? 'SUB 13 FEMENINA' : 'SUB 13 MASCULINA';
          } else if (cat === 'SUB 15' || cat === 'SUB15') {
            nuevaCategoria = sexo === 'femenino' ? 'SUB 15 FEMENINA' : 'SUB 15 MASCULINA';
          } else if (cat === 'SUB 17' || cat === 'SUB17') {
            nuevaCategoria = sexo === 'femenino' ? 'SUB 17 FEMENINA' : 'SUB 17 MASCULINA';
          } else if (cat === 'SUB 19' || cat === 'SUB19') {
            nuevaCategoria = sexo === 'femenino' ? 'SUB 19 FEMENINA' : 'SUB 19 MASCULINA';
          } else if (cat === 'SUB 23' || cat === 'SUB23') {
            nuevaCategoria = sexo === 'femenino' ? 'SUB 23 FEMENINA' : 'SUB 23 MASCULINA';
          } else if (cat === 'ADULTA') {
            nuevaCategoria = sexo === 'femenino' ? 'ADULTA FEMENINA' : 'ADULTA MASCULINA';
          }
          
          // Solo actualizar si cambió
          if (nuevaCategoria && nuevaCategoria !== data.categoria) {
            batch.update(document.ref, { categoria: nuevaCategoria });
            actualizados++;
            addLog(`✅ ${data.primerNombre} ${data.apellidoPaterno}: ${data.categoria} → ${nuevaCategoria}`);
          }
        } catch (err) {
          errores++;
          addLog(`❌ Error con ${data.primerNombre}: ${err.message}`);
        }

        setProgreso(Math.round(((i + 1) / total) * 100));
      }

      if (actualizados > 0) {
        addLog("\n⏳ Guardando cambios en Firebase...");
        await batch.commit();
        addLog('\n🎉 ¡Corrección completada!');
        addLog(`✅ Deportistas actualizados: ${actualizados}`);
        addLog(`❌ Errores: ${errores}`);
        
        setResultado({
          exitoso: true,
          actualizados,
          errores,
          total
        });
      } else {
        addLog("️ No se encontraron categorías para corregir");
        setResultado({
          exitoso: true,
          actualizados: 0,
          errores: 0,
          total,
          mensaje: "No se encontraron categorías para corregir"
        });
      }
    } catch (error) {
      addLog(`❌ Error fatal: ${error.message}`);
      setResultado({
        exitoso: false,
        error: error.message
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">🔧 Corregir Categorías</h2>
          <p className="text-gray-600 mt-1">Actualiza las categorías de los deportistas importados</p>
        </div>
        <button 
          onClick={() => navigate('/deportistas')}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
        >
          ← Volver
        </button>
      </div>

      {/* Advertencia */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-bold text-yellow-900 mb-2">⚠️ Importante</h3>
        <p className="text-sm text-yellow-800">
          Esta herramienta corregirá automáticamente las categorías de los deportistas importados desde Excel 
          para que coincidan con las categorías del sistema.
        </p>
        <ul className="list-disc list-inside text-sm text-yellow-800 mt-2 space-y-1">
          <li>SUB 9 → SUB 9 MIXTO</li>
          <li>SUB 10 → SUB 10 MIXTO</li>
          <li>SUB 11 → SUB 11 MIXTO</li>
          <li>SUB 13/15/17/19/23 → Se asignará según el sexo (FEMENINA/MASCULINA)</li>
          <li>ADULTA → Se asignará según el sexo (FEMENINA/MASCULINA)</li>
        </ul>
      </div>

      {/* Botón de ejecutar */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <button 
          onClick={corregirCategorias}
          disabled={cargando}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
            cargando 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {cargando ? '⏳ Corrigiendo categorías...' : '🚀 Iniciar Corrección'}
        </button>

        {cargando && (
          <div className="mt-4">
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
          </div>
        )}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-700">📋 Registro de actividad</h3>
          </div>
          <div className="max-h-96 overflow-y-auto p-4 bg-gray-900 text-green-400 font-mono text-xs space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Resultado final */}
      {resultado && (
        <div className={`rounded-lg p-6 ${resultado.exitoso ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h3 className={`text-2xl font-bold mb-4 ${resultado.exitoso ? 'text-green-800' : 'text-red-800'}`}>
            {resultado.exitoso ? '✅ ¡Corrección completada!' : '❌ Error en la corrección'}
          </h3>
          
          {resultado.exitoso ? (
            <div className="space-y-2 text-green-800">
              <p className="text-lg">📊 Resumen:</p>
              <p>✔️ Total procesados: {resultado.total}</p>
              <p>✅ Actualizados: {resultado.actualizados}</p>
              <p>❌ Errores: {resultado.errores}</p>
              {resultado.mensaje && <p className="text-yellow-700 mt-2">{resultado.mensaje}</p>}
            </div>
          ) : (
            <p className="text-red-700">Error: {resultado.error}</p>
          )}

          <div className="mt-6 flex gap-3">
            <button 
              onClick={() => navigate('/deportistas')}
              className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-800 font-medium"
            >
              Ver Deportistas →
            </button>
            {resultado.exitoso && resultado.actualizados > 0 && (
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
              >
                Recargar página
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}