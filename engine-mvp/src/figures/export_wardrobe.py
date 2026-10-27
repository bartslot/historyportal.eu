# The figure kit's body: export_clean_glb.py (deform-only rig, fixed materials) plus every hair and two hats,
# no face morphs (faces are painted decals). Output is git-ignored.
# Run: Blender -b "$CM/Blender.blend" --python export_wardrobe.py -- engine-mvp/public/assets/models/customizable-man/man-wardrobe.glb
# Clips: engine-mvp/public/assets/models/customizable-man/clips/ = M_Walk_001.glb + M_Standing_Idle_001.glb copied from
# storage/app/public/avatars/animation/masculine/glb/ (Ready Player Me animation library, Mixamo bone names).
import sys

CM = "/Users/bartslot/BartsAutomation/BartsDev/workflows/3D pipeline/customizable-man"  # licensed model + its scripts
sys.path.insert(0, CM)
src = open(CM + "/export_clean_glb.py").read()
src = src.replace('"Geo_Hair_Black_Base", "Hair_07",', '"Geo_Hair_Black_Base", "Hair_00", "Hair_01", "Hair_02", "Hair_03", "Hair_04", "Hair_05", "Hair_07", "Cowboy_Hat", "Bucket_Hat",')
src = src.replace("    stats = add_face_morphs(bpy.data.objects[SRC_RIG], meshes)", "")
src = src.replace("    self_check(stats, meshes)", "")
src = src.replace("export_morph=True", "export_morph=False")
assert "add_face_morphs(bpy" not in src and "Cowboy_Hat" in src
exec(compile(src, "export_clean_glb.py", "exec"))
