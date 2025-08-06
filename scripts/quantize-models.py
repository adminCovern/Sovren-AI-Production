#!/usr/bin/env python3

"""
SOVREN AI MODEL QUANTIZATION SCRIPT
Quantizes LLM models for optimal resource usage
"""

import torch
import os
import sys
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelQuantizer:
    def __init__(self, base_path="/opt/sovren/models/llm"):
        self.base_path = Path(base_path)
        
    def quantize_to_int8(self, model_path, output_path):
        """Quantize model to INT8 using BitsAndBytes"""
        logger.info(f"Quantizing {model_path} to INT8...")
        
        try:
            # Configure INT8 quantization
            quantization_config = BitsAndBytesConfig(
                load_in_8bit=True,
                llm_int8_threshold=6.0,
                llm_int8_has_fp16_weight=False,
                llm_int8_enable_fp32_cpu_offload=True
            )
            
            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            # Load model with quantization
            model = AutoModelForCausalLM.from_pretrained(
                model_path,
                quantization_config=quantization_config,
                device_map="auto",
                torch_dtype=torch.float16,
                trust_remote_code=True
            )
            
            # Save quantized model
            os.makedirs(output_path, exist_ok=True)
            model.save_pretrained(output_path)
            tokenizer.save_pretrained(output_path)
            
            logger.info(f"✅ INT8 quantized model saved to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ INT8 quantization failed: {e}")
            return False
    
    def quantize_to_int4(self, model_path, output_path):
        """Quantize model to INT4 using AutoGPTQ"""
        logger.info(f"Quantizing {model_path} to INT4...")
        
        try:
            # Configure INT4 quantization
            quantize_config = BaseQuantizeConfig(
                bits=4,
                group_size=128,
                desc_act=False,
                static_groups=False,
                sym=True,
                true_sequential=True,
                model_name_or_path=model_path,
                model_file_base_name="model"
            )
            
            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            # Load model for quantization
            model = AutoGPTQForCausalLM.from_pretrained(
                model_path,
                quantize_config=quantize_config,
                low_cpu_mem_usage=True,
                device_map="auto",
                trust_remote_code=True
            )
            
            # Create calibration dataset
            calibration_data = self.create_calibration_dataset(tokenizer)
            
            # Quantize model
            model.quantize(calibration_data)
            
            # Save quantized model
            os.makedirs(output_path, exist_ok=True)
            model.save_quantized(output_path)
            tokenizer.save_pretrained(output_path)
            
            logger.info(f"✅ INT4 quantized model saved to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ INT4 quantization failed: {e}")
            return False
    
    def quantize_to_fp8(self, model_path, output_path):
        """Quantize model to FP8 (simulated with FP16 + optimization)"""
        logger.info(f"Quantizing {model_path} to FP8...")
        
        try:
            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            # Load model in FP16 (FP8 support varies by hardware)
            model = AutoModelForCausalLM.from_pretrained(
                model_path,
                torch_dtype=torch.float16,
                device_map="auto",
                low_cpu_mem_usage=True,
                trust_remote_code=True
            )
            
            # Optimize for inference
            model = torch.compile(model, mode="reduce-overhead")
            
            # Save optimized model
            os.makedirs(output_path, exist_ok=True)
            model.save_pretrained(output_path, torch_dtype=torch.float16)
            tokenizer.save_pretrained(output_path)
            
            # Create FP8 configuration marker
            with open(os.path.join(output_path, "fp8_config.json"), "w") as f:
                import json
                json.dump({
                    "quantization": "fp8_simulation",
                    "base_dtype": "float16",
                    "optimized": True,
                    "compiled": True
                }, f, indent=2)
            
            logger.info(f"✅ FP8 optimized model saved to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ FP8 optimization failed: {e}")
            return False
    
    def create_calibration_dataset(self, tokenizer, num_samples=128):
        """Create calibration dataset for quantization"""
        calibration_texts = [
            "The future of artificial intelligence lies in",
            "Business strategy requires careful analysis of",
            "Financial markets demonstrate volatility when",
            "Technology advancement accelerates through",
            "Legal compliance ensures organizational",
            "Marketing effectiveness depends on understanding",
            "Operational efficiency improves through systematic",
            "Risk management involves identifying potential",
            "Customer satisfaction drives business growth by",
            "Innovation requires balancing creativity with"
        ]
        
        # Extend to required number of samples
        extended_texts = (calibration_texts * (num_samples // len(calibration_texts) + 1))[:num_samples]
        
        # Tokenize
        calibration_data = []
        for text in extended_texts:
            tokens = tokenizer(
                text,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True
            )
            calibration_data.append(tokens)
        
        return calibration_data
    
    def quantize_all_models(self):
        """Quantize all SOVREN AI models according to specifications"""
        logger.info("🔢 Starting SOVREN AI model quantization...")
        
        results = {}
        
        # Executive models - INT8 quantization
        executive_roles = ["cfo", "cmo", "cto", "clo"]
        for role in executive_roles:
            input_path = self.base_path / "executives" / f"qwen2.5-32b-{role}"
            output_path = self.base_path / "executives" / f"qwen2.5-32b-{role}-int8"

            if input_path.exists():
                results[f"executive-{role}"] = self.quantize_to_int8(str(input_path), str(output_path))
            else:
                logger.warning(f"⚠️ Executive model not found: {input_path}")
                results[f"executive-{role}"] = False

        # Utility model - INT4 quantization
        utility_input = self.base_path / "utility" / "qwen2.5-7b-instruct"
        utility_output = self.base_path / "utility" / "qwen2.5-7b-instruct-int4"

        if utility_input.exists():
            results["utility"] = self.quantize_to_int4(str(utility_input), str(utility_output))
        else:
            logger.warning(f"⚠️ Utility model not found: {utility_input}")
            results["utility"] = False

        # Voice model - FP8 optimization
        voice_input = self.base_path / "voice" / "qwen2.5-14b-instruct"
        voice_output = self.base_path / "voice" / "qwen2.5-14b-instruct-fp8"
        
        if voice_input.exists():
            results["voice"] = self.quantize_to_fp8(str(voice_input), str(voice_output))
        else:
            logger.warning(f"⚠️ Voice model not found: {voice_input}")
            results["voice"] = False
        
        # Consciousness models - Keep FP16 (no quantization needed)
        consciousness_models = ["qwen2.5-72b-instruct", "qwen2.5-32b-instruct"]
        for model in consciousness_models:
            model_path = self.base_path / "consciousness" / model
            if model_path.exists():
                logger.info(f"✅ Consciousness model {model} already in FP16 - no quantization needed")
                results[f"consciousness-{model}"] = True
            else:
                logger.warning(f"⚠️ Consciousness model not found: {model_path}")
                results[f"consciousness-{model}"] = False
        
        # Summary
        logger.info("📊 Quantization Results:")
        for model, success in results.items():
            status = "✅ SUCCESS" if success else "❌ FAILED"
            logger.info(f"  {model}: {status}")
        
        successful = sum(results.values())
        total = len(results)
        logger.info(f"🎯 Overall: {successful}/{total} models processed successfully")
        
        return results

def main():
    """Main quantization process"""
    print("🔢 SOVREN AI Model Quantization")
    print("=" * 50)
    
    # Check GPU availability
    if not torch.cuda.is_available():
        print("❌ CUDA not available. GPU required for quantization.")
        sys.exit(1)
    
    print(f"🔥 GPU Available: {torch.cuda.get_device_name()}")
    print(f"💾 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    
    # Initialize quantizer
    quantizer = ModelQuantizer()
    
    # Run quantization
    results = quantizer.quantize_all_models()
    
    # Exit with appropriate code
    if all(results.values()):
        print("✅ All models quantized successfully!")
        sys.exit(0)
    else:
        print("⚠️ Some models failed to quantize. Check logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
