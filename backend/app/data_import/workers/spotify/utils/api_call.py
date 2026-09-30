import asyncio
import inspect
import time
from typing import Any, Callable

_execution_lock = asyncio.Lock()
_time_last_api_call = 0.0 # Stocke le timestamp de la fin du dernier appel

async def run_spotify_task(func: Callable, *args, **kwargs) -> Any:
    """
    Exécute 'func' de manière unique. Si un autre thread appelle cette
    fonction, il attendra que le précédent ait terminé.
    """
    global _time_last_api_call
    # Le 'with' s'occupe de verrouiller (acquire) et déverrouiller (release)
    # même si la fonction 'func' plante (exception)
    async with _execution_lock:
        func_name = getattr(func, '__name__', str(func))
        print(f"🔒 Verrou acquis. Exécution de {func_name}...")
        try:
            if inspect.iscoroutinefunction(func): result = await func(*args, **kwargs)
            else: result = func(*args, **kwargs)
            time_now = time.time()
            wait_time = max(0, 2.25 - (time_now - _time_last_api_call))
            if wait_time > 0: await asyncio.sleep(wait_time)
            _time_last_api_call = time_now
            print("🔓 Tâche terminée, verrou libéré.")
            return result
        except Exception as e:
            print(f"⚠️ [Lock] Erreur dans {func_name}: {e}")
            raise e
        finally: print(f"🔓 [Lock] Libéré : {func_name}")