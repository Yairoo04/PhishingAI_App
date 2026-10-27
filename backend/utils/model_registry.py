import os
import pickle
import tensorflow as tf
from sklearn.ensemble import RandomForestClassifier
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class ModelRegistry:
    
    
    def __init__(self, model_dir: str):
        
        self.model_dir = model_dir
        self.models: dict[str, Any] = {}  
    
    def load_model(self, model_name: str, model_type: str = "pickle") -> Any:
        
        key = f"{model_name}_{model_type}"
        
        if key not in self.models:
            try:
                
                extension_map = {
                    "pickle": "pkl",
                    "keras": "keras"
                }
                if model_type not in extension_map:
                    raise ValueError(f"Unsupported model_type: {model_type}. Use 'pickle' or 'keras'.")
                
                file_extension = extension_map[model_type]
                model_path = os.path.join(self.model_dir, f"{model_name}.{file_extension}")
                
                if not os.path.exists(model_path):
                    raise FileNotFoundError(f"Model file not found: {model_path}")
                
                if model_type == "pickle":
                    with open(model_path, "rb") as f:
                        model = pickle.load(f)
                    
                    if not isinstance(model, RandomForestClassifier):
                        raise TypeError(f"Loaded object from {model_path} is not a RandomForestClassifier")
                
                elif model_type == "keras":
                    model = tf.keras.models.load_model(model_path)
                
                self.models[key] = model
                logger.info(f"Model loaded successfully: {key} from {model_path}")
            
            except FileNotFoundError as fnf_err:
                logger.error(f"Model loading failed - file not found: {fnf_err}")
                raise
            except TypeError as te_err:
                logger.error(f"Type mismatch when loading model {key}: {te_err}")
                raise
            except Exception as e:
                logger.exception(f"Unexpected error loading model {key}: {e}")
                raise
        
        return self.models[key]
    
    def clear_cache(self, model_name: Optional[str] = None) -> None:
        
        if model_name:
            keys_to_remove = [k for k in self.models if k.startswith(f"{model_name}_")]
            for key in keys_to_remove:
                del self.models[key]
            logger.info(f"Cleared cache for models starting with '{model_name}'")
        else:
            self.models.clear()
            logger.info("Cleared entire model cache")