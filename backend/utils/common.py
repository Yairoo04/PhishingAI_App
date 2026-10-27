import os
import numpy as np
import cv2
import tensorflow as tf
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)


@contextmanager
def temp_file(file, filename: str):
    
    upload_folder = os.getenv("UPLOAD_FOLDER", "./Uploads")
    os.makedirs(upload_folder, exist_ok=True)
    
    file_path = os.path.join(upload_folder, filename)
    try:
        file.save(file_path)
        logger.debug(f"Temporary file saved: {file_path}")
        yield file_path
    finally:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.debug(f"Cleaned up temporary file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to clean up temporary file {file_path}: {e}")


def preprocess_image_for_efficientnetv2m(image: np.ndarray, img_size: tuple = (480, 480)) -> np.ndarray:
    
    try:
        
        image = cv2.resize(image, img_size)
        
        
        image = image.astype("float32")
        
        
        image = tf.keras.applications.efficientnet_v2.preprocess_input(image)
        
        
        image = np.expand_dims(image, axis=0)
        
        return image
    
    except Exception as e:
        logger.error(f"Error preprocessing image for EfficientNetV2-M: {e}")
        raise ValueError(f"Unable to preprocess image: {str(e)}")