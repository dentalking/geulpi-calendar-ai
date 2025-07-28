#!/usr/bin/env python3
"""
Script to manage model versions
"""

import argparse
import json
from models.version_manager import version_manager
from tabulate import tabulate


def list_models(args):
    """List all models in the registry"""
    models = version_manager.list_models()
    if not models:
        print("No models found in registry")
        return
    
    print("\nRegistered Models:")
    for model in models:
        print(f"  - {model}")


def list_versions(args):
    """List all versions of a model"""
    versions = version_manager.list_versions(args.model_name)
    if not versions:
        print(f"No versions found for model: {args.model_name}")
        return
    
    # Prepare data for table
    data = []
    for v in versions:
        data.append([
            v.version,
            v.created_at.strftime("%Y-%m-%d %H:%M"),
            v.metadata.get("stage", "none"),
            json.dumps(v.metrics, indent=2)
        ])
    
    headers = ["Version", "Created", "Stage", "Metrics"]
    print(f"\nVersions for {args.model_name}:")
    print(tabulate(data, headers=headers, tablefmt="grid"))


def compare_versions(args):
    """Compare two versions of a model"""
    try:
        comparison = version_manager.compare_versions(
            args.model_name, 
            args.version1, 
            args.version2
        )
        
        print(f"\nComparison of {args.model_name} versions:")
        print(f"Version 1: {comparison['version1']}")
        print(f"Version 2: {comparison['version2']}")
        print(f"Time difference: {comparison['created_diff_days']} days")
        
        print("\nMetrics comparison:")
        data = []
        for metric, diff in comparison['metrics_diff'].items():
            data.append([
                metric,
                f"{diff['v1']:.4f}",
                f"{diff['v2']:.4f}",
                f"{diff['diff']:.4f}",
                f"{diff['pct_change']:.2f}%"
            ])
        
        headers = ["Metric", "Version 1", "Version 2", "Diff", "% Change"]
        print(tabulate(data, headers=headers, tablefmt="grid"))
        
    except Exception as e:
        print(f"Error comparing versions: {e}")


def promote_version(args):
    """Promote a version to a stage"""
    try:
        version_manager.promote_version(
            args.model_name,
            args.version,
            args.stage
        )
        print(f"Successfully promoted {args.model_name} v{args.version} to {args.stage}")
    except Exception as e:
        print(f"Error promoting version: {e}")


def rollback_model(args):
    """Rollback to previous version"""
    try:
        previous_version = version_manager.rollback(args.model_name, args.stage)
        print(f"Successfully rolled back {args.model_name} in {args.stage} to v{previous_version}")
    except Exception as e:
        print(f"Error rolling back: {e}")


def delete_version(args):
    """Delete a specific version"""
    # Confirm deletion
    confirm = input(f"Are you sure you want to delete {args.model_name} v{args.version}? (y/N): ")
    if confirm.lower() != 'y':
        print("Deletion cancelled")
        return
    
    try:
        version_manager.delete_version(args.model_name, args.version)
        print(f"Successfully deleted {args.model_name} v{args.version}")
    except Exception as e:
        print(f"Error deleting version: {e}")


def main():
    parser = argparse.ArgumentParser(description="Model Version Management")
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # List models command
    parser_list = subparsers.add_parser('list-models', help='List all models')
    parser_list.set_defaults(func=list_models)
    
    # List versions command
    parser_versions = subparsers.add_parser('list-versions', help='List versions of a model')
    parser_versions.add_argument('model_name', help='Name of the model')
    parser_versions.set_defaults(func=list_versions)
    
    # Compare versions command
    parser_compare = subparsers.add_parser('compare', help='Compare two versions')
    parser_compare.add_argument('model_name', help='Name of the model')
    parser_compare.add_argument('version1', help='First version')
    parser_compare.add_argument('version2', help='Second version')
    parser_compare.set_defaults(func=compare_versions)
    
    # Promote version command
    parser_promote = subparsers.add_parser('promote', help='Promote a version to stage')
    parser_promote.add_argument('model_name', help='Name of the model')
    parser_promote.add_argument('version', help='Version to promote')
    parser_promote.add_argument('--stage', default='production', help='Stage to promote to')
    parser_promote.set_defaults(func=promote_version)
    
    # Rollback command
    parser_rollback = subparsers.add_parser('rollback', help='Rollback to previous version')
    parser_rollback.add_argument('model_name', help='Name of the model')
    parser_rollback.add_argument('--stage', default='production', help='Stage to rollback')
    parser_rollback.set_defaults(func=rollback_model)
    
    # Delete version command
    parser_delete = subparsers.add_parser('delete', help='Delete a version')
    parser_delete.add_argument('model_name', help='Name of the model')
    parser_delete.add_argument('version', help='Version to delete')
    parser_delete.set_defaults(func=delete_version)
    
    args = parser.parse_args()
    
    if args.command:
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()