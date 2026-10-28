# The figure kit's body: export_clean_glb.py (deform-only rig, fixed materials) plus every hair, two hats and the
# found garment slots (fit_garments.py),
# no face morphs (faces are painted), no images (flat dyes). Output is git-ignored.
# Run: Blender -b "$CM/Blender.blend" --python export_wardrobe.py -- engine-mvp/public/assets/models/customizable-man/man-lite.glb
# Clips: engine-mvp/public/assets/models/customizable-man/clips/ = M_Walk_001.glb + M_Standing_Idle_001.glb copied from
# storage/app/public/avatars/animation/masculine/glb/ (Ready Player Me animation library, Mixamo bone names).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fit_garments import fit_garments  # noqa: E402  found garment parts as LEGO slots

CM = "/Users/bartslot/BartsAutomation/BartsDev/workflows/3D pipeline/customizable-man"  # licensed model + its scripts
sys.path.insert(0, CM)
src = open(CM + "/export_clean_glb.py").read()
src = src.replace('"Geo_Hair_Black_Base", "Hair_07",', '"Geo_Hair_Black_Base", "Hair_00", "Hair_01", "Hair_02", "Hair_03", "Hair_04", "Hair_05", "Hair_07", "Cowboy_Hat", "Bucket_Hat",')
src = src.replace("    stats = add_face_morphs(bpy.data.objects[SRC_RIG], meshes)", "")
src = src.replace("    self_check(stats, meshes)", "")
src = src.replace("export_morph=True", "export_morph=False")
src = src.replace("export_yup=True,", "export_yup=True,\n        export_image_format=\"NONE\",")  # flat dyes: no texture is ever read
src = src.replace("    meshes = bind(rig)\n", "    meshes = bind(rig)\n    meshes += fit_garments(rig, meshes)\n")
assert "fit_garments(rig, meshes)" in src
assert "add_face_morphs(bpy" not in src and "Cowboy_Hat" in src
exec(compile(src, "export_clean_glb.py", "exec"))
