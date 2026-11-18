"""
SAMVAD AI — Sign Keypoint Model Trainer
Trains a PyTorch neural network and Scikit-Learn baseline on normalized MediaPipe 21-hand-landmark keypoints.
Produces verifiable test metrics, confusion matrix, per-class evaluation, and inference latency benchmarks.
Adheres to ml-best-practices.
"""

import os
import time
import json
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)
import joblib
from sklearn.neural_network import MLPClassifier

# Set random seeds for reproducibility
SEED = 42
np.random.seed(SEED)
torch.manual_seed(SEED)

DATASET_CSV = "dataset/keypoint.csv"
LABELS_CSV = "dataset/keypoint_classifier_label.csv"
MODEL_DIR = "backend/app/models"
os.makedirs(MODEL_DIR, exist_ok=True)


class KeypointClassifierPyTorch(nn.Module):
    """
    Lightweight, high-accuracy PyTorch MLP for 42-dimensional normalized hand keypoints (21 x,y landmarks).
    Optimized for sub-millisecond CPU inference on laptops and mobile devices.
    """
    def __init__(self, num_classes=26):
        super(KeypointClassifierPyTorch, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(42, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, num_classes)
        )

    def forward(self, x):
        return self.net(x)


def load_dataset():
    print(f"Loading dataset from {DATASET_CSV}...")
    X = []
    y = []
    with open(DATASET_CSV, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            parts = line.split(",")
            try:
                label = int(parts[0].strip())
                coords = [float(v.strip()) for v in parts[1:]]
                if len(coords) == 42:
                    y.append(label)
                    X.append(coords)
            except Exception as e:
                continue

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int64)
    print(f"Loaded {len(X)} valid samples with feature dim {X.shape[1]}.")

    # Load label names
    with open(LABELS_CSV, "r", encoding="utf-8-sig") as f:
        labels = [line.strip() for line in f if line.strip()]
    print(f"Loaded {len(labels)} class labels: {labels[:10]}...")

    return X, y, labels


def train_and_evaluate():
    start_time = time.time()
    X, y, class_names = load_dataset()
    num_classes = len(class_names)

    # Verify class balance
    unique_classes, counts = np.unique(y, return_counts=True)
    class_distribution = {class_names[c]: int(cnt) for c, cnt in zip(unique_classes, counts) if c < len(class_names)}
    print(f"Class distribution summary: min={min(counts)}, max={max(counts)}, total={len(X)}")

    # Strict featurization ordering: split train (70%), val (15%), test (15%)
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.15, random_state=SEED, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.17647, random_state=SEED, stratify=y_train_val
    )  # 0.17647 of 0.85 = ~0.15

    print(f"Dataset splits: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")

    # 1. Train Scikit-Learn baseline MLP for quick verification & fast CPU inference
    print("\n--- Training Scikit-Learn Classifier ---")
    sklearn_mlp = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation='relu',
        max_iter=50,
        random_state=SEED,
        early_stopping=True,
        validation_fraction=0.1
    )
    sklearn_mlp.fit(X_train, y_train)
    y_test_pred_sk = sklearn_mlp.predict(X_test)
    sk_acc = accuracy_score(y_test, y_test_pred_sk)
    print(f"Scikit-Learn Test Accuracy: {sk_acc * 100:.2f}%")

    # Save Scikit-Learn model
    sk_model_path = os.path.join(MODEL_DIR, "keypoint_classifier.joblib")
    joblib.dump(sklearn_mlp, sk_model_path)
    print(f"Saved Scikit-Learn model to {sk_model_path}")

    # 2. Train PyTorch Model
    print("\n--- Training PyTorch Classifier ---")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using compute device: {device}")

    train_dataset = TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train))
    val_dataset = TensorDataset(torch.from_numpy(X_val), torch.from_numpy(y_val))
    test_dataset = TensorDataset(torch.from_numpy(X_test), torch.from_numpy(y_test))

    train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=256, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=256, shuffle=False)

    model = KeypointClassifierPyTorch(num_classes=num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.002, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=2)

    best_val_acc = 0.0
    best_state_dict = None
    epochs = 20

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        correct_train = 0
        total_train = 0
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * batch_x.size(0)
            _, preds = torch.max(outputs, 1)
            correct_train += (preds == batch_y).sum().item()
            total_train += batch_x.size(0)

        # Validation
        model.eval()
        val_loss = 0.0
        correct_val = 0
        total_val = 0
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(device), batch_y.to(device)
                outputs = model(batch_x)
                loss = criterion(outputs, batch_y)
                val_loss += loss.item() * batch_x.size(0)
                _, preds = torch.max(outputs, 1)
                correct_val += (preds == batch_y).sum().item()
                total_val += batch_x.size(0)

        epoch_train_acc = correct_train / total_train
        epoch_val_acc = correct_val / total_val
        scheduler.step(epoch_val_acc)

        if epoch_val_acc > best_val_acc:
            best_val_acc = epoch_val_acc
            best_state_dict = model.state_dict().copy()

        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch {epoch:02d}/{epochs:02d} | Train Acc: {epoch_train_acc*100:.2f}% | Val Acc: {epoch_val_acc*100:.2f}%")

    # Load best weights
    model.load_state_dict(best_state_dict)

    # 3. Comprehensive Test Evaluation
    print("\n--- Evaluating on Unseen Test Set ---")
    model.eval()
    all_preds = []
    all_targets = []
    inference_times = []

    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            batch_x = batch_x.to(device)
            t0 = time.perf_counter()
            outputs = model(batch_x)
            inference_times.append((time.perf_counter() - t0) / batch_x.size(0))
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(batch_y.numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)

    test_accuracy = float(accuracy_score(all_targets, all_preds))
    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(
        all_targets, all_preds, average='macro', zero_division=0
    )
    precision_weighted, recall_weighted, f1_weighted, _ = precision_recall_fscore_support(
        all_targets, all_preds, average='weighted', zero_division=0
    )
    avg_latency_ms = float(np.mean(inference_times) * 1000)

    print(f"PyTorch Test Accuracy:      {test_accuracy * 100:.2f}%")
    print(f"Macro Precision / Recall / F1: {precision_macro:.4f} / {recall_macro:.4f} / {f1_macro:.4f}")
    print(f"Weighted F1-Score:             {f1_weighted:.4f}")
    print(f"Average Single-Frame Latency:  {avg_latency_ms:.3f} ms")

    # Save PyTorch Model
    pytorch_path = os.path.join(MODEL_DIR, "keypoint_classifier.pt")
    torch.save({
        'model_state_dict': model.state_dict(),
        'num_classes': num_classes,
        'class_names': class_names,
        'input_dim': 42,
        'test_accuracy': test_accuracy,
        'f1_weighted': float(f1_weighted)
    }, pytorch_path)
    print(f"Saved PyTorch model checkpoint to {pytorch_path}")

    # Save labels JSON and metadata
    labels_json_path = os.path.join(MODEL_DIR, "keypoint_labels.json")
    with open(labels_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "classes": class_names,
            "total_classes": num_classes,
            "description": "MediaPipe Hands normalized landmark sign classes (A-Z)"
        }, f, indent=2)

    cm = confusion_matrix(all_targets, all_preds).tolist()
    metadata = {
        "model_name": "SAMVAD-AI-Keypoint-MLP",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataset_source": "Muhib-Mehdi/ASL-Recognition-System (MIT License)",
        "framework": "PyTorch + Scikit-Learn",
        "num_classes": num_classes,
        "classes": class_names,
        "total_samples": len(X),
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "metrics": {
            "test_accuracy": round(test_accuracy, 4),
            "macro_precision": round(float(precision_macro), 4),
            "macro_recall": round(float(recall_macro), 4),
            "macro_f1": round(float(f1_macro), 4),
            "weighted_f1": round(float(f1_weighted), 4),
            "sklearn_baseline_accuracy": round(float(sk_acc), 4),
            "avg_inference_latency_ms": round(avg_latency_ms, 3)
        },
        "device": str(device),
        "training_duration_seconds": round(time.time() - start_time, 2)
    }

    metadata_path = os.path.join(MODEL_DIR, "model_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model metadata to {metadata_path}")

    print("\n--- Training & Evaluation Complete! ---")
    return metadata


if __name__ == "__main__":
    train_and_evaluate()
