import asyncio
import inspect
from typing import Any, Callable

_execution_lock = asyncio.Lock()

async def run_spotify_task(func: Callable, *args, **kwargs) -> Any:
    """
    Exécute 'func' de manière unique. Si un autre thread appelle cette
    fonction, il attendra que le précédent ait terminé.
    """
    # Le 'with' s'occupe de verrouiller (acquire) et déverrouiller (release)
    # même si la fonction 'func' plante (exception)
    async with _execution_lock:
        func_name = getattr(func, '__name__', str(func))
        print(f"🔒 Verrou acquis. Exécution de {func_name}...")
        try:
            if inspect.iscoroutinefunction(func): result = await func(*args, **kwargs)
            else: result = func(*args, **kwargs)
            await asyncio.sleep(2.25)
            print("🔓 Tâche terminée, verrou libéré.")
            return result
        except Exception as e:
            print(f"⚠️ [Lock] Erreur dans {func_name}: {e}")
            raise e
        finally: print(f"🔓 [Lock] Libéré : {func_name}")