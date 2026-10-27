import os
import time
import pickle
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")

PATHS = {
    "URL": {
        "base": os.path.join(MODELS_DIR, "stacking_base_models_url.pkl"),
        "meta": os.path.join(MODELS_DIR, "stacking_meta_xgb_url.pkl"),
        "feat_count": 35
    },
    "Email": {
        "base": os.path.join(MODELS_DIR, "email_stacking_base_models.pkl"),
        "meta": os.path.join(MODELS_DIR, "email_stacking_meta_xgb.pkl"),
        "feat_count": 30
    },
    "PDF": {
        "base": os.path.join(MODELS_DIR, "stacking_base_models_final.pkl"),
        "meta": os.path.join(MODELS_DIR, "stacking_meta_xgb_final.pkl"),
        "feat_count": 31
    },
    "Image": {
        "path": os.path.join(MODELS_DIR, "efficientnetv2m_phishing.keras")
    }
}

class SafeDense(tf.keras.layers.Dense):
    def __init__(self, *args, **kwargs):
        kwargs.pop("quantization_config", None)
        super().__init__(*args, **kwargs)

def load_stacking(name):
    cfg = PATHS[name]
    if not (os.path.exists(cfg["base"]) and os.path.exists(cfg["meta"])):
        print(f"  [!] Skipping {name}: Model files not found.")
        return None, None
    with open(cfg["base"], "rb") as f:
        base = pickle.load(f)
    with open(cfg["meta"], "rb") as f:
        meta = pickle.load(f)
    return base, meta

def load_cnn():
    path = PATHS["Image"]["path"]
    if not os.path.exists(path):
        print(f"  [!] Skipping Image: Model file not found at {path}")
        return None
    return tf.keras.models.load_model(path, custom_objects={"Dense": SafeDense}, compile=False)

def benchmark_stacking(name, base_models, meta_model, num_samples=100):
    print(f"\n[*] Benchmarking {name} (Stacking) - {num_samples} samples")
    feat_count = PATHS[name]["feat_count"]
    dummy_data = np.random.rand(num_samples, feat_count).astype(np.float32)
    latencies = []
    
    X_warm = dummy_data[0:1]
    p_rf = base_models['rf'].predict_proba(X_warm)[:, 1]
    p_lgbm = base_models['lgbm'].predict_proba(X_warm)[:, 1]
    p_xgb = base_models['xgb'].predict_proba(X_warm)[:, 1]
    p_cat = base_models['cat'].predict_proba(X_warm)[:, 1]
    m_feat = np.column_stack([p_rf, p_lgbm, p_xgb, p_cat])
    meta_model.predict_proba(m_feat)

    start_total = time.perf_counter()
    for i in range(num_samples):
        X = dummy_data[i:i+1]
        t0 = time.perf_counter()
        p_rf = base_models['rf'].predict_proba(X)[:, 1]
        p_lgbm = base_models['lgbm'].predict_proba(X)[:, 1]
        p_xgb = base_models['xgb'].predict_proba(X)[:, 1]
        p_cat = base_models['cat'].predict_proba(X)[:, 1]
        m_feat = np.column_stack([p_rf, p_lgbm, p_xgb, p_cat])
        meta_model.predict_proba(m_feat)
        latencies.append((time.perf_counter() - t0) * 1000.0)
        
    total_time = time.perf_counter() - start_total
    avg_lat = np.mean(latencies)
    throughput = num_samples / total_time
    print(f"  Latency: {avg_lat:.2f} ms | Throughput: {throughput:.2f} s/s")
    return avg_lat, throughput

def benchmark_cnn(model, num_samples=100):
    print(f"\n[*] Benchmarking Image (EfficientNetV2M) - {num_samples} samples")
    dummy_img = np.random.randint(0, 255, size=(1, 480, 480, 3), dtype=np.uint8).astype(np.float32)
    img_pre = tf.keras.applications.efficientnet_v2.preprocess_input(dummy_img)
    latencies = []
    
    model.predict(img_pre, verbose=0)
    
    start_total = time.perf_counter()
    for i in range(num_samples):
        t0 = time.perf_counter()
        model.predict(img_pre, verbose=0)
        latencies.append((time.perf_counter() - t0) * 1000.0)
        
    total_time = time.perf_counter() - start_total
    avg_lat = np.mean(latencies)
    throughput = num_samples / total_time
    print(f"  Latency: {avg_lat:.2f} ms | Throughput: {throughput:.2f} s/s")
    return avg_lat, throughput

def plot_all(results):
    names = list(results.keys())
    latencies = [r[0] for r in results.values()]
    throughputs = [r[1] for r in results.values()]
    
    fig, axes = plt.subplots(1, 2, figsize=(16, 7))
    colors = ['#4C72B0', '#55A868', '#C44E52', '#8172B3']
    
    bars1 = axes[0].bar(names, latencies, color=colors[:len(names)])
    axes[0].set_ylabel('Avg Latency (ms)')
    axes[0].set_title('Inference Latency (Lower is Better)')
    for b in bars1:
        axes[0].text(b.get_x()+b.get_width()/2, b.get_height(), f'{b.get_height():.1f}', ha='center', va='bottom')

    bars2 = axes[1].bar(names, throughputs, color=colors[:len(names)])
    axes[1].set_ylabel('Throughput (samples/sec)')
    axes[1].set_title('Inference Throughput (Higher is Better)')
    for b in bars2:
        axes[1].text(b.get_x()+b.get_width()/2, b.get_height(), f'{b.get_height():.1f}', ha='center', va='bottom')

    plt.tight_layout()
    plt.savefig(os.path.join(BASE_DIR, "..", "latency_comparison_full.png"), dpi=300)
    print(f"\n[+] Multi-modal comparison chart saved as 'latency_comparison_full.png'")

def main():
    print("=== Multi-Modal Phishing Detection Benchmark ===")
    results = {}
    
    b, m = load_stacking("URL")
    if b: results["URL"] = benchmark_stacking("URL", b, m)
    
    b, m = load_stacking("Email")
    if b: results["Email"] = benchmark_stacking("Email", b, m)
    
    b, m = load_stacking("PDF")
    if b: results["PDF"] = benchmark_stacking("PDF", b, m)
    
    cnn = load_cnn()
    if cnn: results["Image"] = benchmark_cnn(cnn)
    
    if results:
        plot_all(results)
    else:
        print("No models were benchmarked.")

if __name__ == "__main__":
    main()
